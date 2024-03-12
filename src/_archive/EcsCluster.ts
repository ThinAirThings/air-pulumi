import { createNameTag } from "../utils/createNameTag";
import * as aws from "@pulumi/aws";


export const EcsCluster = ({
    tag
}: {
    tag: string
}) => {
    // Create nametag
    const nameTag = createNameTag(tag).replaceAll("_", "-");

    // Create Cluster
    const cluster = new aws.ecs.Cluster(`${nameTag}_ecs_cluster`, {
        
    });
    return cluster;
}