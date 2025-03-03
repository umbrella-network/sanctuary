include .env

TAG=`git rev-parse --short HEAD`
IMAGE="sanctuary"

CRED_TMP := /tmp/.credentials.tmp
DURATION := 900
AWS_REGION := eu-central-1
ECR_AWS_REGION := us-east-2

default: assume update-stg-kubeconfig

assume:
	@aws sts assume-role --profile umb-master \
	--role-arn $(ECR_ROLE_ARN) \
	--region $(ECR_AWS_REGION) --role-session-name temp-session --duration $(DURATION) --query 'Credentials' > $(CRED_TMP)
	@aws --profile umb-central configure set aws_access_key_id $$(cat ${CRED_TMP} | jq -r '.AccessKeyId' )
	@aws --profile umb-central configure set aws_secret_access_key $$(cat ${CRED_TMP} | jq -r '.SecretAccessKey' )
	@aws --profile umb-central configure set aws_session_token $$(cat ${CRED_TMP} | jq -r '.SessionToken' )

update-stg-kubeconfig:
	@aws sts assume-role --profile umb-master \
	--role-arn $(KUBE_ROLE_ARN) \
	--region $(AWS_REGION) --role-session-name temp-session --duration $(DURATION) --query 'Credentials' > $(CRED_TMP)
	@aws --profile umb-staging configure set aws_access_key_id $$(cat ${CRED_TMP} | jq -r '.AccessKeyId' )
	@aws --profile umb-staging configure set aws_secret_access_key $$(cat ${CRED_TMP} | jq -r '.SecretAccessKey' )
	@aws --profile umb-staging configure set aws_session_token $$(cat ${CRED_TMP} | jq -r '.SessionToken' )
	@aws --profile umb-staging --region $(AWS_REGION) eks update-kubeconfig --kubeconfig ~/.kube/config-staging --name umb_staging

build:
	@echo "## Building the docker image ##"
	@docker build -t $(IMAGE) .

build-sbx:
	@echo "## Building the docker image for sbx ##"
	@docker buildx build  --push --platform linux/amd64 -t "$(shell kubectl --kubeconfig ~/.kube/config-staging get deployments -n sandbox sanctuary-api-bsc01 -o=jsonpath='{$$.spec.template.spec.containers[:1].image}')" .

login:
	@aws ecr --profile umb-central --region $(ECR_AWS_REGION) get-login-password  | docker login --username AWS --password-stdin $(AWS_REPOSITORY)

publish-sbx:
	@kubectl --kubeconfig ~/.kube/config-staging rollout restart deployment/sanctuary-api-bsc01 -n sandbox
	@kubectl --kubeconfig ~/.kube/config-staging rollout restart deployment/sanctuary-foreign-chain-worker-bsc01 -n sandbox
	@kubectl --kubeconfig ~/.kube/config-staging rollout restart deployment/sanctuary-metrics-worker-bsc01 -n sandbox
	@kubectl --kubeconfig ~/.kube/config-staging rollout restart deployment/sanctuary-resolver-worker-bsc01 -n sandbox
	@kubectl --kubeconfig ~/.kube/config-staging rollout restart deployment/sanctuary-sync-worker-bsc01 -n sandbox
	@kubectl --kubeconfig ~/.kube/config-staging rollout restart deployment/sanctuary-scheduler-bsc01 -n sandbox
	
sbx: assume login update-stg-kubeconfig build-sbx publish-sbx
