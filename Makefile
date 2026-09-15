SHELL := /bin/bash

COMPOSE ?= docker compose

-include .env
export

POSTGRES_USER ?= postgres
POSTGRES_DB ?= property_management
APP_PORT ?= 4000
FE_PORT ?= 3000

.DEFAULT_GOAL := up

.PHONY: up down restart build logs ps migrate migrate-status migrate-rollback seed psql be-shell fe-shell clean help

up: ## Build and start all services (db + backend + frontend)
	$(COMPOSE) up --build -d
	@echo ""
	@echo "All services started:"
	@echo "  Frontend : http://localhost:$(FE_PORT)"
	@echo "  Backend  : http://localhost:$(APP_PORT)"
	@echo "  Health   : http://localhost:$(APP_PORT)/health"
	@echo "  Login    : admin@example.com / Admin123"

down: ## Stop and remove all services
	$(COMPOSE) down

restart: down up ## Restart all services

build: ## Build all images
	$(COMPOSE) build

logs: ## Follow logs of all services
	$(COMPOSE) logs -f

ps: ## Show service status
	$(COMPOSE) ps

migrate: ## Run pending database migrations
	$(COMPOSE) exec backend npm run db:migrate

migrate-status: ## Show migration status
	$(COMPOSE) exec backend npm run db:migrate:status

migrate-rollback: ## Show rollback instructions for the last migration
	$(COMPOSE) exec backend npm run db:migrate:rollback

seed: ## Seed/refresh the admin user
	$(COMPOSE) exec backend npm run db:seed

psql: ## Open a psql shell in the database
	$(COMPOSE) exec db psql -U $(POSTGRES_USER) -d $(POSTGRES_DB)

be-shell: ## Shell into the backend container
	$(COMPOSE) exec backend sh

fe-shell: ## Shell into the frontend container
	$(COMPOSE) exec frontend sh

clean: ## Stop services and delete volumes (database data)
	$(COMPOSE) down -v

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(firstword $(MAKEFILE_LIST)) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-18s\033[0m %s\n", $$1, $$2}'
