import { createNameTag } from "../utils/createNameTag";
import * as aws from "@pulumi/aws";
import * as awsx from "@pulumi/awsx";
import * as pulumi from "@pulumi/pulumi";
export const ApplicationLoadBalancer = ({
    tag
}: {
    tag: string
}) => {
    // Create nametag
    const nameTag = createNameTag(tag).replaceAll("_", "-");
    // Create a VPC
    const vpc = new awsx.ec2.Vpc(`${nameTag}-vpc`, {
        cidrBlock: "10.0.0.0/16"
    });
    const securityGroup = new aws.ec2.SecurityGroup(`${nameTag}-sg`, {
        vpcId: vpc.vpcId,
        egress: [{
            fromPort: 0,
            toPort: 0,
            protocol: "-1",
            cidrBlocks: ["0.0.0.0/0"]
        }],
        ingress: [{
            fromPort: 80,
            toPort: 80,
            protocol: "tcp",
            cidrBlocks: ["0.0.0.0/0"]
        }, {
            fromPort: 443,
            toPort: 443,
            protocol: "tcp",
            cidrBlocks: ["0.0.0.0/0"]
        }]
    })
    // Create a new load balancer
    const alb = new aws.lb.LoadBalancer(`${nameTag}-alb`, {
        loadBalancerType: "application",
        subnets: vpc.publicSubnetIds,
        securityGroups: [securityGroup.id]
    });

    // Create a listener
    const listener = new aws.lb.Listener(`${nameTag}-listener`, {
        loadBalancerArn: alb.arn,
        port: 443,
        protocol: "HTTPS",
        certificateArn: new pulumi.Config().require("certificateArn"),
        defaultActions: [{
            type: "fixed-response",
            fixedResponse: {
                contentType: "text/plain",
                messageBody: "Default Target GG Load Balancer",
                statusCode: "200"
            }
        }]
    });
    // Create CNAME Record
    const zone = aws.route53.getZoneOutput({
        name: new pulumi.Config().require("rootDomain"),
    });
    const domainName = `${pulumi.getStack() === 'prod' ? tag : `${pulumi.getStack()}-${tag}.dev.`}${new pulumi.Config().require("rootDomain")}`;
    new aws.route53.Record(`${nameTag}_cname`, {
        zoneId: zone.zoneId,
        name: domainName,
        type: "CNAME",
        ttl: 300,
        records: [alb.dnsName]
    });
    return {
        alb,
        listener,
        domainName
    };
}