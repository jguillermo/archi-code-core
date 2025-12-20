.DEFAULT_GOAL := main-script
## GENERAL ##
SHELL := /bin/bash
.PHONY: combine

export OUTPUT_FILE=temp_combined.txt
export CONTENT_FILES=.content_files

main-script:
	npm run build
	npm run format:fix
	npm run lint:fix
	npm run lint
	npm run format
	npm run test
	npm run test:e2e

install:
	npm install
	npm --prefix project/api install
	npm --prefix project/web install
	npm install bcrypt jsonwebtoken libsodium-wrappers-sumo

fix:
	npm run format:fix
	npm run lint:fix

test:
	npm run test

build:
	npm run build

version:
	npx lerna version

publish:
	npx lerna publish from-package --yes

#@FILE_LIST=$$( $(MAKE) list-files | grep 'bounded-context/financial-management/src' | grep -Ev "\.spec\.ts$$" ); \


list-files:
	@IGNORE_LIST="\.gitignore$$|Makefile$$|\.gitkeep$$|package-lock.json$$|\.prompt$$|\.md$$|\.woff2$$|\.svg$$|\.png$$|\.jpg$$|\.txt$$|^\.husky|ci\.yml$$|\.zip$\"; \
	FILES_CMD="git ls-files"; \
	$$FILES_CMD | grep -Ev "$$IGNORE_LIST" || echo "No files found after applying filters"


config-files:
	@FILE_LIST=$$( $(MAKE) list-files | grep -Ev "\.(ts|css|html|scss)$$|project/web/src/@fuse" ); \
	$(MAKE) read-files FILE_LIST="$$FILE_LIST"  \
	$(MAKE) write-content FILE_PATHS="'$$CONTENT_FILES'";

bounded-auth:
	@FILE_LIST=$$( $(MAKE) list-files | grep -E "^bounded-context/authentication-authorization/(src|test)" ); \
	$(MAKE) read-files FILE_LIST="$$FILE_LIST"  \
	$(MAKE) write-content FILE_PATHS="'$$CONTENT_FILES'";

package-criteria:
	@FILE_LIST=$$( $(MAKE) list-files | grep -E "^packages/criteria/src" ); \
	$(MAKE) read-files FILE_LIST="$$FILE_LIST"  \
	$(MAKE) write-content FILE_PATHS="'$$CONTENT_FILES'";

read-files:
	@if [ -z "$$FILE_LIST" ]; then \
		echo "Error: FILE_LIST is empty. No files found for bounded context."; \
		exit 1; \
	fi; \
	echo "Checking if $$CONTENT_FILES exists"; \
	if [ -f $$CONTENT_FILES ]; then \
		echo "Removing existing $$CONTENT_FILES"; \
		rm $$CONTENT_FILES; \
	fi; \
	echo "$$FILE_LIST" | tr ' ' '\n' | while read -r file; do \
		if [ -f "$$file" ]; then \
		    echo "===== $$file =====" >> $$CONTENT_FILES; \
			cat "$$file" >> $$CONTENT_FILES; \
			echo -e "\n" >> $$CONTENT_FILES; \
		else \
			echo "Warning: File $$file does not exist, skipping."; \
		fi; \
	done;

write-content:
	@if [ -z "$(FILE_PATHS)" ]; then \
		echo "Error: Debes definir la variable FILE_PATHS con una lista de cadenas."; \
		exit 1; \
	fi; \
	echo "Checking if $$OUTPUT_FILE exists"; \
	if [ -f $$OUTPUT_FILE ]; then \
		echo "Removing existing $$OUTPUT_FILE"; \
		rm $$OUTPUT_FILE; \
	fi; \
	echo "Creating and combining files from $$DIRECTORY into $$OUTPUT_FILE"; \
	> $$OUTPUT_FILE; \
	for file in $(FILE_PATHS); do \
		if [ -f "$$file" ]; then \
			cat "$$file" >> $$OUTPUT_FILE; \
		else \
			echo "Warning: File $$file does not exist, skipping."; \
			echo "$$file" >> $$OUTPUT_FILE; \
		fi; \
		echo -e "\n" >> $$OUTPUT_FILE; \
	done; \
	echo "Copying $$OUTPUT_FILE content to clipboard"; \
	cat $$OUTPUT_FILE | pbcopy; \
	echo "Content copied to clipboard";


#config-financial-management:
#	@FILE_LIST=$$( $(MAKE) config-files | grep 'bounded-context/financial-management' ); \
#	echo "$$FILE_LIST"; \
#	$(MAKE) process-content FILE_LIST="$$FILE_LIST";
#
#
#app-config:
#	@FILE_LIST=$$( $(MAKE) config-files ); \
#	echo "$$FILE_LIST"; \
#	$(MAKE) process-content FILE_LIST="$$FILE_LIST";
#
#
#
#
#files-financial-management:
#	@FILE_LIST=$$( $(MAKE) list-files | grep 'bounded-context/financial-management/src' ); \
#	echo "$$FILE_LIST"; \
#	$(MAKE) process-content FILE_LIST="$$FILE_LIST" INIT_FILE="bounded-context/financial-management/doc/financial-management.prompt";
#
#
#generate-examples:
#	@FILE_LIST=$$( $(MAKE) list-files | grep 'bounded-context/financial-management/.*\.ts$$' ); \
#	echo "$$FILE_LIST"; \
#	$(MAKE) process-content FILE_LIST="$$FILE_LIST";

kill-ports:
	@echo "🔴 Cleaning ports 3000, 4200, 27017..."
	@for port in 3000 4200 27017; do \
		echo "👉 Killing process on port $$port..."; \
		pids=$$(lsof -ti :$$port); \
		if [ -n "$$pids" ]; then \
			kill -9 $$pids && echo "✅ Killed process on port $$port."; \
		else \
			echo "✅ Port $$port is already free."; \
		fi \
	done

help:
	@printf "\033[31m%-16s %-59s %s\033[0m\n" "Target" "Help" "Usage"; \
	printf "\033[31m%-16s %-59s %s\033[0m\n" "------" "----" "-----"; \
	grep -hE '^[a-zA-Z0-9_-]+:.## .+$$' $(MAKEFILE_LIST) | sed -E 's/:.##\s*/:/' | awk 'BEGIN {FS = ":"}; {printf "\033[32m%-16s\033[0m %-58s\n", $$1, $$2}'; \
	# Recorre todas las líneas y filtra ejemplos con #e#, eliminando #e# y mostrando completos
	@grep -hE '^\s*#e# ' $(MAKEFILE_LIST) | sed 's/#e#/ - /' | awk 'BEGIN {FS = ":"}; {printf "\033[32m%-16s\033[0m %-58s\n", $$1, $$2}';

