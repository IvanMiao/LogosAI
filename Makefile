up:
	docker compose up --build

down:
	docker compose down

clean:
	rm -rf **/__pycache__
	rm -rf backend/.ruff_cache
	rm -rf backend/.pytest_cache