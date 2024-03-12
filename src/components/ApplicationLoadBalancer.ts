import { createNameTag } from "../utils/createNameTag";
import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";
export const ApplicationLoadBalancer = ({
    tag
}: {
    tag: string
}) => {
    // Create nametag
    const nameTag = createNameTag(tag).replaceAll("_", "-");
    // Create a new load balancer
    const alb = new aws.lb.LoadBalancer(`${nameTag}-alb`, {
        loadBalancerType: "application"
    });
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
    return {
        alb,
        listener
    };
}