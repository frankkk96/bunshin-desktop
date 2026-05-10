# Bunshin 版本发布管理
.PHONY: help version-sync release-patch release-minor release-major tag-list

help:
	@echo "Bunshin 版本管理命令:"
	@echo "  make version-sync VERSION=x.y.z  - 同步所有配置文件版本号"
	@echo "  make release-patch               - 发布 patch 版本 (bug修复)"
	@echo "  make release-minor               - 发布 minor 版本 (新功能)"
	@echo "  make release-major               - 发布 major 版本 (重大更新)"
	@echo "  make tag-list                    - 列出所有版本标签"
	@echo ""
	@echo "示例:"
	@echo "  make release-patch               # 自动计算并发布下一个patch版本"
	@echo "  make version-sync VERSION=0.2.0  # 手动设置版本号"

# 获取当前版本
CURRENT_VERSION := $(shell grep '"version":' package.json | sed 's/.*"version": "\(.*\)".*/\1/')
MAJOR := $(shell echo $(CURRENT_VERSION) | cut -d. -f1)
MINOR := $(shell echo $(CURRENT_VERSION) | cut -d. -f2)
PATCH := $(shell echo $(CURRENT_VERSION) | cut -d. -f3)

# 计算下一个版本号
NEXT_PATCH := $(MAJOR).$(MINOR).$(shell echo $$(($(PATCH) + 1)))
NEXT_MINOR := $(MAJOR).$(shell echo $$(($(MINOR) + 1))).0
NEXT_MAJOR := $(shell echo $$(($(MAJOR) + 1))).0.0

# 同步版本号到所有配置文件
version-sync:
	@if [ -z "$(VERSION)" ]; then echo "请指定版本号: make version-sync VERSION=x.y.z"; exit 1; fi
	@echo "📦 同步版本号到 $(VERSION)"
	@# 更新 package.json
	@sed -i '' 's/"version": ".*"/"version": "$(VERSION)"/' package.json
	@# 更新 tauri.conf.json
	@sed -i '' 's/"version": ".*"/"version": "$(VERSION)"/' src-tauri/tauri.conf.json
	@# 更新 Cargo.toml
	@sed -i '' 's/^version = ".*"/version = "$(VERSION)"/' src-tauri/Cargo.toml
	@# 更新 Cargo.lock
	@cd src-tauri && cargo update -p Bunshin
	@echo "✅ 版本号已同步到 $(VERSION)"

# 发布 patch 版本
release-patch:
	@echo "🚀 准备发布 patch 版本: $(CURRENT_VERSION) -> $(NEXT_PATCH)"
	@make version-sync VERSION=$(NEXT_PATCH)
	@git add -A
	@git commit -m "chore: release v$(NEXT_PATCH)"
	@git tag v$(NEXT_PATCH)
	@echo "✅ 已创建 tag: v$(NEXT_PATCH)"
	@echo "📌 执行以下命令推送并触发CI:"
	@echo "   git push && git push --tags"

# 发布 minor 版本
release-minor:
	@echo "🚀 准备发布 minor 版本: $(CURRENT_VERSION) -> $(NEXT_MINOR)"
	@make version-sync VERSION=$(NEXT_MINOR)
	@git add -A
	@git commit -m "chore: release v$(NEXT_MINOR)"
	@git tag v$(NEXT_MINOR)
	@echo "✅ 已创建 tag: v$(NEXT_MINOR)"
	@echo "📌 执行以下命令推送并触发CI:"
	@echo "   git push && git push --tags"

# 发布 major 版本
release-major:
	@echo "🚀 准备发布 major 版本: $(CURRENT_VERSION) -> $(NEXT_MAJOR)"
	@make version-sync VERSION=$(NEXT_MAJOR)
	@git add -A
	@git commit -m "chore: release v$(NEXT_MAJOR)"
	@git tag v$(NEXT_MAJOR)
	@echo "✅ 已创建 tag: v$(NEXT_MAJOR)"
	@echo "📌 执行以下命令推送并触发CI:"
	@echo "   git push && git push --tags"

# 列出所有标签
tag-list:
	@echo "📦 所有版本标签:"
	@git tag -l "v*" | sort -V