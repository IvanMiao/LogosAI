.PHONY: up down logs clean re

up:
	docker compose up --build --detach --wait
	@echo "LogosAI is running at http://localhost:5173"

logs:
	docker compose logs --follow

down:
	docker compose down

clean:
	rm -rf **/__pycache__
	rm -rf backend/.ruff_cache
	rm -rf backend/.pytest_cache

re: down up
