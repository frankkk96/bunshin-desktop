use age::{secrecy::ExposeSecret, x25519, Decryptor, Encryptor, Identity};
use anyhow::{Context, Result};
use dashmap::DashMap;
use serde::{Deserialize, Serialize};
use std::fs;
use std::io::{Read, Write};
use std::path::PathBuf;
use std::sync::Arc;

#[derive(Clone)]
pub struct SecureStorage {
    cache: Arc<DashMap<String, String>>,
    storage_path: PathBuf,
    identity: x25519::Identity,
}

impl SecureStorage {
    /// Create SecureStorage with custom base directory
    pub fn with_base_dir(service_name: impl Into<String>, base_dir: PathBuf) -> Self {
        let service_name = service_name.into();
        let storage_path = base_dir
            .join("secure")
            .join(format!("{}.age", service_name));
        let identity = Self::get_or_create_identity_with_base(&service_name, &base_dir);

        Self {
            cache: Arc::new(DashMap::new()),
            storage_path,
            identity,
        }
    }

    fn get_or_create_identity_with_base(
        service_name: &str,
        base_dir: &PathBuf,
    ) -> x25519::Identity {
        let key_path = base_dir
            .join("secure")
            .join("keys")
            .join(format!("{}.key", service_name));
        Self::load_or_generate_identity(&key_path)
    }

    fn load_or_generate_identity(key_path: &PathBuf) -> x25519::Identity {
        if key_path.exists() {
            // 读取现有密钥
            if let Ok(key_data) = fs::read_to_string(key_path) {
                if let Ok(identity) = key_data.parse::<x25519::Identity>() {
                    return identity;
                }
            }
        }

        // 生成新密钥
        let identity = x25519::Identity::generate();

        // 保存密钥
        if let Some(parent) = key_path.parent() {
            let _ = fs::create_dir_all(parent);
        }
        let _ = fs::write(key_path, identity.to_string().expose_secret().as_bytes());

        identity
    }

    fn load_storage(&self) -> Result<DashMap<String, String>> {
        let storage = DashMap::new();

        if !self.storage_path.exists() {
            return Ok(storage);
        }

        let encrypted_data =
            fs::read(&self.storage_path).context("Failed to read secure storage file")?;

        if encrypted_data.is_empty() {
            return Ok(storage);
        }

        // 解密数据
        let decrypted = self.decrypt_data(&encrypted_data)?;

        // 反序列化
        let data: std::collections::HashMap<String, String> =
            serde_json::from_slice(&decrypted).context("Failed to deserialize storage data")?;

        for (key, value) in data {
            storage.insert(key, value);
        }

        Ok(storage)
    }

    fn save_storage(&self) -> Result<()> {
        // 确保目录存在
        if let Some(parent) = self.storage_path.parent() {
            fs::create_dir_all(parent).context("Failed to create storage directory")?;
        }

        // 收集所有数据
        let data: std::collections::HashMap<String, String> = self
            .cache
            .iter()
            .map(|entry| (entry.key().clone(), entry.value().clone()))
            .collect();

        // 序列化
        let json_data = serde_json::to_vec(&data).context("Failed to serialize storage data")?;

        // 加密
        let encrypted_data = self.encrypt_data(&json_data)?;

        // 写入文件
        fs::write(&self.storage_path, encrypted_data)
            .context("Failed to write secure storage file")?;

        Ok(())
    }

    fn encrypt_data(&self, data: &[u8]) -> Result<Vec<u8>> {
        let recipient = self.identity.to_public();
        let encryptor = Encryptor::with_recipients(vec![Box::new(recipient)])
            .expect("Failed to create encryptor");

        let mut encrypted = Vec::new();
        let mut writer = encryptor
            .wrap_output(&mut encrypted)
            .map_err(|e| anyhow::anyhow!("Failed to create encrypted writer: {}", e))?;

        writer
            .write_all(data)
            .map_err(|e| anyhow::anyhow!("Failed to write data: {}", e))?;

        writer
            .finish()
            .map_err(|e| anyhow::anyhow!("Failed to finish encryption: {}", e))?;

        Ok(encrypted)
    }

    fn decrypt_data(&self, encrypted_data: &[u8]) -> Result<Vec<u8>> {
        let decryptor = Decryptor::new(encrypted_data)
            .map_err(|e| anyhow::anyhow!("Failed to create decryptor: {}", e))?;

        let mut decrypted = Vec::new();
        let mut reader = match decryptor {
            Decryptor::Recipients(d) => d
                .decrypt(std::iter::once(&self.identity as &dyn Identity))
                .map_err(|e| anyhow::anyhow!("Failed to decrypt: {}", e))?,
            Decryptor::Passphrase(_) => {
                return Err(anyhow::anyhow!("Passphrase decryption not supported"))
            }
        };

        reader
            .read_to_end(&mut decrypted)
            .map_err(|e| anyhow::anyhow!("Failed to read decrypted data: {}", e))?;

        Ok(decrypted)
    }

    fn ensure_loaded(&self) -> Result<()> {
        if self.cache.is_empty() {
            let loaded = self.load_storage()?;
            for entry in loaded.iter() {
                self.cache
                    .insert(entry.key().clone(), entry.value().clone());
            }
        }
        Ok(())
    }

    pub fn set(&self, key: &str, value: &str) -> Result<()> {
        self.ensure_loaded()?;
        self.cache.insert(key.to_string(), value.to_string());
        self.save_storage()?;
        Ok(())
    }

    pub fn get(&self, key: &str) -> Result<Option<String>> {
        self.ensure_loaded()?;
        Ok(self.cache.get(key).map(|v| v.clone()))
    }

    pub fn delete(&self, key: &str) -> Result<()> {
        self.ensure_loaded()?;
        self.cache.remove(key);
        self.save_storage()?;
        Ok(())
    }

    pub fn set_json<T: Serialize>(&self, key: &str, value: &T) -> Result<()> {
        let json = serde_json::to_string(value).context("Failed to serialize value to JSON")?;
        self.set(key, &json)
    }

    pub fn get_json<T: for<'de> Deserialize<'de>>(&self, key: &str) -> Result<Option<T>> {
        match self.get(key)? {
            Some(json) => {
                let value =
                    serde_json::from_str(&json).context("Failed to deserialize value from JSON")?;
                Ok(Some(value))
            }
            None => Ok(None),
        }
    }

    pub fn list_keys(&self) -> Vec<String> {
        let _ = self.ensure_loaded(); // Ignore error, return empty list on failure
        self.cache.iter().map(|entry| entry.key().clone()).collect()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_secure_storage() {
        let storage = SecureStorage::new("test_app");

        // Test set and get
        storage.set("test_key", "test_value").unwrap();
        assert_eq!(
            storage.get("test_key").unwrap(),
            Some("test_value".to_string())
        );

        // Test has
        assert!(storage.has("test_key").unwrap());
        assert!(!storage.has("non_existent").unwrap());

        // Test delete
        storage.delete("test_key").unwrap();
        assert!(!storage.has("test_key").unwrap());
    }

    #[test]
    fn test_prefixed_storage() {
        let storage = SecureStorage::new("test_app");
        let prefixed = storage.with_prefix("test_prefix");

        prefixed.set("key1", "value1").unwrap();
        assert_eq!(prefixed.get("key1").unwrap(), Some("value1".to_string()));

        // Different prefix should not see the value
        let other_prefixed = storage.with_prefix("other_prefix");
        assert_eq!(other_prefixed.get("key1").unwrap(), None);
    }

    #[test]
    fn test_encryption_persistence() {
        let storage1 = SecureStorage::new("test_persistence");
        storage1.set("persist_key", "persist_value").unwrap();

        // Create new instance (simulating app restart)
        let storage2 = SecureStorage::new("test_persistence");
        assert_eq!(
            storage2.get("persist_key").unwrap(),
            Some("persist_value".to_string())
        );
    }
}
