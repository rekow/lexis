# <Makefile description>
# author: <author>
# copyright: <copyright>


SHELL := /bin/bash
THIS_DIR := $(shell dirname $(realpath $(lastword $(MAKEFILE_LIST))))

.PHONY: build clean distclean test test-ci

all: build

build: test
	@echo "Building lexis..."
	@echo "Compiling minified dist package with closure compiler..."
	@-java -jar $(THIS_DIR)/node_modules/closure-compiler-stream/lib/compiler.jar \
		--debug false \
		--warning_level VERBOSE \
		--summary_detail_level 3 \
		--language_in ECMASCRIPT5 \
		--js $(THIS_DIR)/src/Future.js\
		--js $(THIS_DIR)/src/LexError.js\
		--js $(THIS_DIR)/src/matchers.js\
		--js $(THIS_DIR)/src/Token.js\
		--js $(THIS_DIR)/src/Lexicon.js\
		--js $(THIS_DIR)/src/Lexer.js\
		--js $(THIS_DIR)/src/index.js \
		--externs $(THIS_DIR)/externs.js \
		--compilation_level ADVANCED_OPTIMIZATIONS \
		--js_output_file $(THIS_DIR)/dist/lexis.min.js \
		--common_js_entry_module $(THIS_DIR)/src/index.js \
		--common_js_module_path_prefix $(THIS_DIR)/src \
		--output_wrapper '(function () {%output%}).call(this);' \
		--process_common_js_modules \
		--use_types_for_optimization
	@echo "Build complete. "

clean:
	@echo "Cleaning built files..."
	@-rm -rf $(THIS_DIR)/dist/**
	@echo "Cleaning test reports..."
	@-rm -rf $(THIS_DIR)/test/reports

distclean: clean

test: $(THIS_DIR)/node_modules

test-ci: test

$(THIS_DIR)/node_modules:
	@npm install