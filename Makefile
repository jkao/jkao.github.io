BUNDLE ?= bundle
DOCKER ?= docker
RUBY_IMAGE ?= ruby:3.2
PORT ?= 4000

RUBY_OK := $(shell ruby -e 'exit Gem::Version.new(RUBY_VERSION) >= Gem::Version.new("3.0") ? 0 : 1' >/dev/null 2>&1 && command -v $(BUNDLE) >/dev/null 2>&1 && echo yes || echo no)

ifeq ($(RUBY_OK),yes)
BUNDLE_RUN := $(BUNDLE)
BUNDLE_CONFIGURE := $(BUNDLE) config set --local path vendor/bundle
SERVE_HOST := 127.0.0.1
else
DOCKER_RUN := $(DOCKER) run --rm --init --user $(shell id -u):$(shell id -g) -e HOME=/tmp -e BUNDLE_PATH=/site/vendor/bundle -v "$(CURDIR):/site" -w /site
BUNDLE_RUN := $(DOCKER_RUN) $(RUBY_IMAGE) bundle
BUNDLE_CONFIGURE := true
SERVE_HOST := 0.0.0.0
endif

JEKYLL := $(BUNDLE_RUN) exec jekyll

.DEFAULT_GOAL := help

.PHONY: help setup serve drafts build check clean new

help:
	@echo "make setup                 Install the site dependencies"
	@echo "make serve                 Preview at http://127.0.0.1:$(PORT)"
	@echo "make drafts                Preview unpublished writing"
	@echo "make new TITLE=\"My post\"  Create an unpublished article"
	@echo "make build                 Build the production site"
	@echo "make check                 Run Jekyll checks and a production build"
	@echo "make clean                 Remove generated files"

setup:
	@if [ "$(RUBY_OK)" != "yes" ]; then command -v $(DOCKER) >/dev/null || (echo "Ruby 3+ with Bundler, or Docker, is required." && exit 1); fi
	$(BUNDLE_CONFIGURE)
	$(BUNDLE_RUN) install

serve:
	$(if $(DOCKER_RUN),$(DOCKER_RUN) -p $(PORT):$(PORT) $(RUBY_IMAGE) bundle exec jekyll,$(JEKYLL)) serve --livereload --host $(SERVE_HOST) --port $(PORT)

drafts:
	$(if $(DOCKER_RUN),$(DOCKER_RUN) -p $(PORT):$(PORT) $(RUBY_IMAGE) bundle exec jekyll,$(JEKYLL)) serve --livereload --unpublished --host $(SERVE_HOST) --port $(PORT)

build:
	JEKYLL_ENV=production $(JEKYLL) build

check:
	$(JEKYLL) doctor
	JEKYLL_ENV=production $(JEKYLL) build --trace

clean:
	$(JEKYLL) clean

new:
	@ruby scripts/new_article.rb "$(TITLE)"
