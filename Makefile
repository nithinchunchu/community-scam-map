.PHONY: dev test build clean

dev:
	uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

test:
	pytest -v tests/

build:
	pip install -r requirements.txt
	@echo "Build complete."

clean:
	rm -rf __pycache__ .pytest_cache *.db
