import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";
import * as apigateway from "@pulumi/aws-apigateway";


export const RestAPI = ({
    name,
    routes,
    apiSubdomain
}: {
    name: string;
    routes: apigateway.types.input.RouteArgs[]
    apiSubdomain: Lowercase<string>;
}) => {
    // Create Domain Name
    const domainName = `${pulumi.getStack() !== 'prod' || pulumi.getStack() !== 'dev' ? pulumi.getStack() : ''}-${apiSubdomain}.api${pulumi.getStack() !== 'prod' ? '.dev' : ''}.${new pulumi.Config().require("rootDomain")}`;
    const gatewayDomainName = new aws.apigateway.DomainName(
        `${name}_api_domain_name`,
        {
            domainName,
            certificateArn: new pulumi.Config().require("certificateArn"),
        },
    );
    // Create API
    const api = new apigateway.RestAPI(`${name}_api`, {
        stageName: pulumi.getStack() === "prod" ? "prod" : "dev",
        routes,
    });
    // Create Base path mapping
    const basepathMapping = new aws.apigateway.BasePathMapping(
        `${name}_api_base_path_mapping`,
        {
            restApi: api.api.id,
            stageName: pulumi.getStack() === "prod" ? "prod" : "dev",
            domainName,
        },
    );
    // Create Route53 Record
    const zone = aws.route53.getZoneOutput({
        name: new pulumi.Config().require("rootDomain"),
    });
    new aws.route53.Record(`${name}_api_record`, {
        zoneId: zone.zoneId,
        name: domainName,
        type: "A",
        aliases: [
            {
                evaluateTargetHealth: false,
                name: gatewayDomainName.cloudfrontDomainName,
                zoneId: gatewayDomainName.cloudfrontZoneId,
            },
        ],
    });
    return {
        api,
        domainName,
    };
}