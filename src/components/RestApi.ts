import { createNameTag } from "../utils/createNameTag";
import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";
import * as apigateway from "@pulumi/aws-apigateway";

export const RestApi = ({
    tag,
    routes,
}: {
    tag: string;
    routes: apigateway.types.input.RouteArgs[];
}) => {
    // Create nametag
    const nameTag = createNameTag(tag).replaceAll("_", "-");
    // Create Domain Name
    const domainName = `${pulumi.getStack()}-${tag}.api.dev.${new pulumi.Config().require("rootDomain")}`;
    const gatewayDomainName = new aws.apigateway.DomainName(
        `${nameTag}_api_domain_name`,
        {
            domainName,
            certificateArn: new pulumi.Config().require("certificateArn"),
        },
    );
    // Create API
    const api = new apigateway.RestAPI(`${nameTag}_api`, {
        stageName: pulumi.getStack() === "prod" ? "prod" : "dev",
        routes,
    });
    // Create Base path mapping
    const basepathMapping = new aws.apigateway.BasePathMapping(
        `${nameTag}_api_base_path_mapping`,
        {
            restApi: api.api.id,
            stageName: pulumi.getStack() === "prod" ? "prod" : "dev",
            domainName: domainName,
        },
    );
    // Create Route53 Record
    const zone = aws.route53.getZoneOutput({
        name: new pulumi.Config().require("rootDomain"),
    });
    new aws.route53.Record(`${nameTag}_api_record`, {
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
};
