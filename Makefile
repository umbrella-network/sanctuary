include .env

TAG=`git rev-parse --short HEAD`
DEVELOP="$(AWS_REPOSITORY)/sanctuary:develop"

CRED_TMP := /tmp/.credentials.tmp
DURATION := 900
AWS_REGION := us-east-2

default: dev

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

build-dev:
	@echo "## Building the docker image ##"
	docker buildx build  --push --platform linux/amd64 -t $(DEVELOP) .

build-sbx:
	@echo "## Building the sbx docker image ##"
	docker buildx build  --push --platform linux/amd64 -t $(shell kubectl --kubeconfig ~/.kube/config-staging get deployments -n sandbox sanctuary-api-bsc01 -o=jsonpath='{$$.spec.template.spec.containers[:1].image}') .

login:
	@aws ecr --profile umb-central --region $(AWS_REGION) get-login-password  | docker login --username AWS --password-stdin $(AWS_REPOSITORY)

publish-bsc:
	@kubectl --kubeconfig ~/.kube/config-staging scale --replicas=0 deployment/sanctuary-api-bsc01 -n dev
	@kubectl --kubeconfig ~/.kube/config-staging scale --replicas=1 deployment/sanctuary-api-bsc01 -n dev
	@kubectl --kubeconfig ~/.kube/config-staging scale --replicas=0 deployment/sanctuary-worker-bsc01 -n dev
	@kubectl --kubeconfig ~/.kube/config-staging scale --replicas=1 deployment/sanctuary-worker-bsc01 -n dev
	@kubectl --kubeconfig ~/.kube/config-staging scale --replicas=0 deployment/sanctuary-scheduler-bsc01 -n dev
	@kubectl --kubeconfig ~/.kube/config-staging scale --replicas=1 deployment/sanctuary-scheduler-bsc01 -n dev

publish-bsc-sbx:
	@kubectl --kubeconfig ~/.kube/config-staging scale --replicas=0 deployment/sanctuary-api-bsc01 -n sandbox
	@kubectl --kubeconfig ~/.kube/config-staging scale --replicas=1 deployment/sanctuary-api-bsc01 -n sandbox
	@kubectl --kubeconfig ~/.kube/config-staging scale --replicas=0 deployment/sanctuary-worker-bsc01 -n sandbox
	@kubectl --kubeconfig ~/.kube/config-staging scale --replicas=1 deployment/sanctuary-worker-bsc01 -n sandbox
	@kubectl --kubeconfig ~/.kube/config-staging scale --replicas=0 deployment/sanctuary-scheduler-bsc01 -n sandbox
	@kubectl --kubeconfig ~/.kube/config-staging scale --replicas=1 deployment/sanctuary-scheduler-bsc01 -n sandbox


dev-bsc: assume login build-dev update-stg-kubeconfig publish-bsc
dev: assume login build-dev update-stg-kubeconfig publish-bsc

sbx-bsc: assume login update-stg-kubeconfig build-sbx publish-bsc-sbx
sbx: sbx-bsc
