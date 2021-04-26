include .env

TAG=`git rev-parse --short HEAD`
DEVELOP="$(AWS_REPOSITORY)/sanctuary:develop"

CRED_TMP := /tmp/.credentials.tmp
DURATION := 900
AWS_REGION := us-east-2

default: build

assume:
	@aws sts assume-role --profile umb-master \
	--role-arn $(ECR_ROLE_ARN) \
	--region us-east-2 --role-session-name temp-session --duration $(DURATION) --query 'Credentials' > $(CRED_TMP)
	@aws --profile umb-central configure set aws_access_key_id $$(cat ${CRED_TMP} | jq -r '.AccessKeyId' )
	@aws --profile umb-central configure set aws_secret_access_key $$(cat ${CRED_TMP} | jq -r '.SecretAccessKey' )
	@aws --profile umb-central configure set aws_session_token $$(cat ${CRED_TMP} | jq -r '.SessionToken' )

update-stg-kubeconfig:
	@aws sts assume-role --profile umb-master \
	--role-arn $(KUBE_ROLE_ARN) \
	--region us-east-2 --role-session-name temp-session --duration $(DURATION) --query 'Credentials' > $(CRED_TMP)
	@aws --profile umb-staging configure set aws_access_key_id $$(cat ${CRED_TMP} | jq -r '.AccessKeyId' )
	@aws --profile umb-staging configure set aws_secret_access_key $$(cat ${CRED_TMP} | jq -r '.SecretAccessKey' )
	@aws --profile umb-staging configure set aws_session_token $$(cat ${CRED_TMP} | jq -r '.SessionToken' )
	@aws --profile umb-staging --region us-east-2 eks update-kubeconfig --kubeconfig ~/.kube/config-staging --name umb_staging

build:
	@echo "## Building the docker image ##"
	@docker build -t $(IMAGE) .

build-dev:
	@echo "## Building the docker image ##"
	docker buildx build  --push --platform linux/amd64 -t $(DEVELOP) .


login:
	@aws ecr --profile umb-central --region $(AWS_REGION) get-login-password  | docker login --username AWS --password-stdin $(AWS_REPOSITORY)

push: login
	@echo "## Pushing image to AWS ##"
	@docker push $(IMAGE)


publish-bsc:
	@kubectl --kubeconfig ~/.kube/config-staging scale --replicas=0 deployment/sanctuary-api-bsc01 -n dev
	@kubectl --kubeconfig ~/.kube/config-staging scale --replicas=1 deployment/sanctuary-api-bsc01 -n dev
	@kubectl --kubeconfig ~/.kube/config-staging scale --replicas=0 deployment/sanctuary-worker-bsc01 -n dev
	@kubectl --kubeconfig ~/.kube/config-staging scale --replicas=1 deployment/sanctuary-worker-bsc01 -n dev
	@kubectl --kubeconfig ~/.kube/config-staging scale --replicas=0 deployment/sanctuary-scheduler-bsc01 -n dev
	@kubectl --kubeconfig ~/.kube/config-staging scale --replicas=1 deployment/sanctuary-scheduler-bsc01 -n dev
	@kubectl --kubeconfig ~/.kube/config-staging scale --replicas=0 deployment/sanctuary-api-bsc02 -n dev
	@kubectl --kubeconfig ~/.kube/config-staging scale --replicas=1 deployment/sanctuary-api-bsc02 -n dev
	@kubectl --kubeconfig ~/.kube/config-staging scale --replicas=0 deployment/sanctuary-worker-bsc02 -n dev
	@kubectl --kubeconfig ~/.kube/config-staging scale --replicas=1 deployment/sanctuary-worker-bsc02 -n dev
	@kubectl --kubeconfig ~/.kube/config-staging scale --replicas=0 deployment/sanctuary-scheduler-bsc02 -n dev
	@kubectl --kubeconfig ~/.kube/config-staging scale --replicas=1 deployment/sanctuary-scheduler-bsc02 -n dev

publish-eth:
	@kubectl --kubeconfig ~/.kube/config-staging scale --replicas=0 deployment/sanctuary-api-eth01 -n dev
	@kubectl --kubeconfig ~/.kube/config-staging scale --replicas=1 deployment/sanctuary-api-eth01 -n dev
	@kubectl --kubeconfig ~/.kube/config-staging scale --replicas=0 deployment/sanctuary-worker-eth01 -n dev
	@kubectl --kubeconfig ~/.kube/config-staging scale --replicas=1 deployment/sanctuary-worker-eth01 -n dev
	@kubectl --kubeconfig ~/.kube/config-staging scale --replicas=0 deployment/sanctuary-scheduler-eth01 -n dev
	@kubectl --kubeconfig ~/.kube/config-staging scale --replicas=1 deployment/sanctuary-scheduler-eth01 -n dev
	@kubectl --kubeconfig ~/.kube/config-staging scale --replicas=0 deployment/sanctuary-api-eth02 -n dev
	@kubectl --kubeconfig ~/.kube/config-staging scale --replicas=1 deployment/sanctuary-api-eth02 -n dev
	@kubectl --kubeconfig ~/.kube/config-staging scale --replicas=0 deployment/sanctuary-worker-eth02 -n dev
	@kubectl --kubeconfig ~/.kube/config-staging scale --replicas=1 deployment/sanctuary-worker-eth02 -n dev
	@kubectl --kubeconfig ~/.kube/config-staging scale --replicas=0 deployment/sanctuary-scheduler-eth02 -n dev
	@kubectl --kubeconfig ~/.kube/config-staging scale --replicas=1 deployment/sanctuary-scheduler-eth02 -n dev


dev-bsc: assume login build-dev update-stg-kubeconfig publish-bsc
dev-eth: assume login build-dev update-stg-kubeconfig publish-eth
dev: assume login build-dev update-stg-kubeconfig publish-bsc publish-eth
