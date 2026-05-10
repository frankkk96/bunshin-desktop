/// Get MIME type from file extension
pub fn get_mime_type_from_extension(ext: &str) -> &'static str {
    let ext_lower = ext.to_lowercase();
    match ext_lower.as_str() {
        // Images
        "jpg" | "jpeg" => "image/jpeg",
        "png" => "image/png",
        "gif" => "image/gif",
        "webp" => "image/webp",
        "svg" => "image/svg+xml",
        "bmp" => "image/bmp",
        "ico" => "image/x-icon",
        // Documents
        "pdf" => "application/pdf",
        "txt" => "text/plain",
        "json" => "application/json",
        "xml" => "application/xml",
        "html" | "htm" => "text/html",
        "css" => "text/css",
        // Code
        "js" => "application/javascript",
        "ts" => "application/typescript",
        // Audio
        "mp3" => "audio/mpeg",
        "wav" => "audio/wav",
        "ogg" => "audio/ogg",
        // Video
        "mp4" => "video/mp4",
        "webm" => "video/webm",
        "avi" => "video/x-msvideo",
        "mov" => "video/quicktime",
        // Archives
        "zip" => "application/zip",
        "tar" => "application/x-tar",
        "gz" => "application/gzip",
        // Office
        "doc" => "application/msword",
        "docx" => "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "xls" => "application/vnd.ms-excel",
        "xlsx" => "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "ppt" => "application/vnd.ms-powerpoint",
        "pptx" => "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        // Default
        _ => "application/octet-stream",
    }
}

/// Detect MIME type from file header bytes (magic numbers)
pub fn detect_mime_from_bytes(bytes: &[u8]) -> &'static str {
    if bytes.len() >= 4 {
        match &bytes[..4] {
            [0xFF, 0xD8, 0xFF, _] => "image/jpeg",
            [0x89, 0x50, 0x4E, 0x47] => "image/png",
            [0x47, 0x49, 0x46, 0x38] => "image/gif",
            [0x25, 0x50, 0x44, 0x46] => "application/pdf",
            _ => "application/octet-stream",
        }
    } else {
        "application/octet-stream"
    }
}

/// Get MIME type from filename (extracts extension)
pub fn get_mime_type(filename: &str) -> String {
    let ext = filename.split('.').last().unwrap_or("");
    get_mime_type_from_extension(ext).to_string()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_extension_detection() {
        assert_eq!(get_mime_type_from_extension("jpg"), "image/jpeg");
        assert_eq!(get_mime_type_from_extension("JPG"), "image/jpeg");
        assert_eq!(get_mime_type_from_extension("png"), "image/png");
        assert_eq!(get_mime_type_from_extension("pdf"), "application/pdf");
        assert_eq!(
            get_mime_type_from_extension("unknown"),
            "application/octet-stream"
        );
    }

    #[test]
    fn test_bytes_detection() {
        assert_eq!(
            detect_mime_from_bytes(&[0xFF, 0xD8, 0xFF, 0xE0]),
            "image/jpeg"
        );
        assert_eq!(
            detect_mime_from_bytes(&[0x89, 0x50, 0x4E, 0x47]),
            "image/png"
        );
        assert_eq!(
            detect_mime_from_bytes(&[0x00, 0x00, 0x00, 0x00]),
            "application/octet-stream"
        );
    }

    #[test]
    fn test_filename_detection() {
        assert_eq!(get_mime_type("photo.jpg"), "image/jpeg");
        assert_eq!(get_mime_type("document.pdf"), "application/pdf");
        assert_eq!(get_mime_type("unknown"), "application/octet-stream");
    }
}
