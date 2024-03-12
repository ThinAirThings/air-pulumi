import { createNameTag } from "../utils/createNameTag";
import * as awsx from "@pulumi/awsx";
import * as pulumi from "@pulumi/pulumi";
export const ApplicationLoadBalancer = ({
    tag
}: {
    tag: string
}) => {
    // Create nametag
    const nameTag = createNameTag(tag).replaceAll("_", "-");
    // Create a new load balancer
    const alb = new awsx.lb.ApplicationLoadBalancer(`${nameTag}-alb`, {
        listeners: [{
            port: 443,
            protocol: "HTTPS",
            certificateArn: new pulumi.Config().require("certificateArn")
        }]
    });
    return alb;
}