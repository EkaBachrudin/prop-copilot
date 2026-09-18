SHELL := /bin/bash

COMPOSE ?= docker compose

-include .env
export

POSTGRES_USER ?= postgres
POSTGRES_DB ?= property_management
APP_PORT ?= 4000
FE_PORT ?= 3000
AGENT_PORT ?= 5000
PGADMIN_PORT ?= 5050

.DEFAULT_GOAL := up

.PHONY: up down restart build logs ps migrate migrate-status migrate-rollback seed psql pgadmin pgadmin-shell be-shell fe-shell agent-shell backfill reindex reset-leads reset-agent clean help

up: ## Build and start all services (db + backend + frontend)
	$(COMPOSE) up --build -d
	@echo ""
	@echo "All services started:"
	@echo "  Frontend : http://localhost:$(FE_PORT)"
	@echo "  Backend  : http://localhost:$(APP_PORT)"
	@echo "  AI agent : http://localhost:$(AGENT_PORT)"
	@echo "  pgAdmin  : http://localhost:$(PGADMIN_PORT)"
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

pgadmin: ## Show pgAdmin web UI URL
	@echo "pgAdmin: http://localhost:$(PGADMIN_PORT)"

pgadmin-shell: ## Shell into the pgAdmin container
	$(COMPOSE) exec pgadmin sh

be-shell: ## Shell into the backend container
	$(COMPOSE) exec backend sh

fe-shell: ## Shell into the frontend container
	$(COMPOSE) exec frontend sh

agent-shell: ## Shell into the ai-agent container
	$(COMPOSE) exec ai-agent sh

backfill: ## Rebuild the RAG vector store from listings + documents (idempotent)
	$(COMPOSE) exec ai-agent npm run rag:reindex

reindex: backfill ## Alias for backfill

reset-leads: ## Drop leads/conversations/messages (keeps properties & listings)
	$(COMPOSE) exec -T db psql -U $(POSTGRES_USER) -d $(POSTGRES_DB) \
		-c "TRUNCATE messages, leads, conversations RESTART IDENTITY CASCADE;"
	@echo "Leads, conversations and messages cleared."

reset-agent: ## Restart the AI agent and re-enable agent_run for all conversations
	$(COMPOSE) restart ai-agent
	$(COMPOSE) exec -T db psql -U $(POSTGRES_USER) -d $(POSTGRES_DB) \
		-c "UPDATE conversations SET agent_run = true;"
	@echo "AI agent restarted and agent_run reset to true."

clean: ## Stop services and delete volumes (database data)
	$(COMPOSE) down -v

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(firstword $(MAKEFILE_LIST)) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-18s\033[0m %s\n", $$1, $$2}'
