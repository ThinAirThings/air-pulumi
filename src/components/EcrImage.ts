
import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import { createNameTag } from "../utils/createNameTag";
import * as docker from "@pulumi/docker";


export const EcrImage = ({
    tag,
    dockerProjectPath,
}: {
    tag: string;
    dockerProjectPath: string;
}) => {
    // Create nametag
    const nameTag = createNameTag(tag).replaceAll("_", "-");
    // Create ECR Repo
    const ecrRepository = new aws.ecr.Repository(`${nameTag}_ecr_repository`, {
        forceDelete: true,
    });
    const authToken = aws.ecr.getAuthorizationTokenOutput({
        registryId: ecrRepository.registryId,
    });
    // Create Docker Image
    const imageTag = `latest-${Math.floor(new Date().getTime() / 1000)}`
    const image = new docker.Image(`${nameTag}_docker_image`, { 
        build: {
            platform: "linux/amd64",
            context: `${dockerProjectPath}/`,
            dockerfile: `${dockerProjectPath}/Dockerfile`
            
        },
        imageName: pulumi.interpolate`${ecrRepository.repositoryUrl}:${imageTag}`,
        registry: {
            username: "AWS",
            password: pulumi.secret(authToken.apply(authToken => authToken.password)),
            server: ecrRepository.repositoryUrl,
        }
    })
    return image
}