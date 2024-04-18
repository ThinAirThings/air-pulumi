import * as _pulumi_github_branch from '@pulumi/github/branch';
import * as _pulumi_github_repository from '@pulumi/github/repository';
import { z, TypeOf } from 'zod';
import * as aws from '@pulumi/aws';
import { APIGatewayProxyEvent } from 'aws-lambda';
import * as pulumi from '@pulumi/pulumi';
import * as _pulumi_aws_iam_accessKey from '@pulumi/aws/iam/accessKey';
import * as _pulumi_aws_iam_user from '@pulumi/aws/iam/user';
import * as _pulumi_aws_s3_bucketV2 from '@pulumi/aws/s3/bucketV2';
import * as _pulumi_aws_apigateway_restAPI from '@pulumi/aws-apigateway/restAPI';
import * as apigateway from '@pulumi/aws-apigateway';
import * as _pulumi_aws_dynamodb_table from '@pulumi/aws/dynamodb/table';

declare const GitHubRepository: ({ repositoryName, description, branchNames }: {
    repositoryName: string;
    description: string;
    branchNames?: string[] | undefined;
}) => {
    repository: _pulumi_github_repository.Repository;
    branches: _pulumi_github_branch.Branch[] | undefined;
};

declare const TSLambdaCallback: <P extends z.ZodObject<any, z.UnknownKeysParam, z.ZodTypeAny, {
    [x: string]: any;
}, {
    [x: string]: any;
}> | z.ZodVoid = z.ZodVoid, E extends z.ZodVoid | z.ZodObject<Record<string, z.ZodString>, z.UnknownKeysParam, z.ZodTypeAny, {
    [x: string]: string;
}, {
    [x: string]: string;
}> = z.ZodVoid>({ fnName, stackVariablesType, payloadType, callback }: {
    fnName: string;
    stackVariablesType?: (() => E) | undefined;
    payloadType?: (() => P) | undefined;
    callback: (payload: (TypeOf<P> & TypeOf<E>)) => Promise<any>;
}, ...args: E extends z.ZodVoid ? [] : [{
    stackVariables: { [K in keyof TypeOf<E>]: TypeOf<E>[K] | pulumi.Output<TypeOf<E>[K]>; };
}]) => aws.lambda.CallbackFunction<APIGatewayProxyEvent, any>;

type ConstructParameters<T extends new (...args: any) => any, Ext extends Record<string, any>> = Omit<NonNullable<ConstructorParameters<T>[1]>, keyof Ext | 'tags'> & Ext;

declare const IamUser: ({ name, ...props }: ConstructParameters<typeof _pulumi_aws_iam_user.User, {
    name: string;
}>) => {
    iamUser: _pulumi_aws_iam_user.User;
    accessKey: _pulumi_aws_iam_accessKey.AccessKey;
};

declare const S3Bucket: ({ name, iamUser, publicAccess, corsRules, ...props }: ConstructParameters<typeof _pulumi_aws_s3_bucketV2.BucketV2, {
    name: string;
    iamUser?: _pulumi_aws_iam_user.User | undefined;
    publicAccess?: boolean | undefined;
    corsRules?: pulumi.Input<pulumi.Input<aws.types.input.s3.BucketCorsConfigurationV2CorsRule>[]> | undefined;
}>) => _pulumi_aws_s3_bucketV2.BucketV2;

declare const RestAPI: ({ name, routes, apiSubdomain }: {
    name: string;
    routes: apigateway.types.input.RouteArgs[];
    apiSubdomain: Lowercase<string>;
}) => {
    api: _pulumi_aws_apigateway_restAPI.RestAPI;
    domainName: string;
};

declare const DynamoTable: ({ name, version, iamUser, ...props }: ConstructParameters<typeof _pulumi_aws_dynamodb_table.Table, {
    name: string;
    version: number;
    iamUser?: _pulumi_aws_iam_user.User | undefined;
}>) => _pulumi_aws_dynamodb_table.Table;

export { DynamoTable, GitHubRepository, IamUser, RestAPI, S3Bucket, TSLambdaCallback };
