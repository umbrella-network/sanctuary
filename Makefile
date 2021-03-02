include .env

TAG=`git rev-parse --short HEAD`
IMAGE="$(AWS_REPOSITORY)/sanctuary:v$(TAG)"

default: build

build:
	@echo "## Building the docker image ##"
	@docker build -t $(IMAGE) .

login:
	@aws ecr get-login-password  | docker login --username AWS --password-stdin $(AWS_REPOSITORY)

push: login
	@echo "## Pushing image to AWS ##"
	@docker push $(IMAGE)

publish:
	@kubectl set image deployment/sanctuary-api sanctuary-api=$(IMAGE)
	@kubectl set image deployment/sanctuary-scheduler sanctuary-scheduler=$(IMAGE)
	@kubectl set image deployment/sanctuary-worker sanctuary-worker=$(IMAGE)

publish-staging:
	@kubectl set image deployment/sanctuary-api sanctuary-api=$(IMAGE) --namespace staging
	@kubectl set image deployment/sanctuary-scheduler sanctuary-scheduler=$(IMAGE) --namespace staging
	@kubectl set image deployment/sanctuary-worker sanctuary-worker=$(IMAGE) --namespace staging

buildm1:
	@echo "## Building the docker image ##"
	@docker buildx build --platform linux/amd64 -t $(IMAGE) .

publish-dev:
	@kubectl set image deployment/sanctuary-api sanctuary-api=$(IMAGE) --namespace dev
	@kubectl set image deployment/sanctuary-scheduler sanctuary-scheduler=$(IMAGE) --namespace dev
	@kubectl set image deployment/sanctuary-worker sanctuary-worker=$(IMAGE) --namespace dev

deploy-dev-m1: buildm1 push publish-dev
deploy: build push publish

dev: build push publish-dev

stage: build push publish-staging
