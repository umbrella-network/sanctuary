REPOSITORY=008205684207.dkr.ecr.us-east-2.amazonaws.com/sanctuary
TAG=`git rev-parse --short HEAD`
IMAGE="$(REPOSITORY):v$(TAG)"

default: build

build:
	@echo "## Building the docker image ##"
	@docker build -t $(IMAGE) .

login:
	`aws ecr get-login --no-include-email`

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

deploy: build push publish

stage: build push publish-staging
