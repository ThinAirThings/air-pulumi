import * as _pulumi_github_branch from '@pulumi/github/branch';
import * as _pulumi_github_repository from '@pulumi/github/repository';
import { ZodType, z, TypeOf } from 'zod';
import * as aws from '@pulumi/aws';
import { APIGatewayProxyEvent } from 'aws-lambda';

declare const GitHubRepository: ({ repositoryName, description, branchNames }: {
    repositoryName: string;
    description: string;
    branchNames?: string[] | undefined;
}) => {
    repository: _pulumi_github_repository.Repository;
    branches: _pulumi_github_branch.Branch[] | undefined;
};

declare const TSLambdaCallbackFactory: <P extends ZodType<any, z.ZodTypeDef, any>, E extends ZodType<any, z.ZodTypeDef, any> = z.ZodVoid>({ fnName, environmentVariables, payloadType, callback }: {
    fnName: string;
    environmentVariables?: E | undefined;
    payloadType: P;
    callback: (payload: TypeOf<P>) => Promise<any>;
}) => (...args: E extends z.ZodVoid ? [] : [{
    environmentVariables: TypeOf<E>;
}]) => aws.lambda.CallbackFunction<APIGatewayProxyEvent, any>;

export { GitHubRepository, TSLambdaCallbackFactory };
