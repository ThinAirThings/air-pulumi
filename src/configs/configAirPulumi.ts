import { createNameTag } from "../utils/createNameTag";
import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";
import { DynamoTableFactory } from "../components/DynamoTableFactory";
import { VercelDeploymentFactory } from "../components/VercelDeploymentFactory";
import { TsLambdaCallbackFactory } from "../components/TsLambdaCallbackFactory";
import { PyLambdaCallbackFactory } from "../components/PyLambdaCallbackFactory";
import { getDynamoTableFactory } from "../getters/getDynamoTableFactory";
import { PyLambdaImageFactory } from "../components/PyLambdaImageFactory";

export const configAirPulumi = () => {
    // Create IAM User
    const iamUser = new aws.iam.User(createNameTag("iamUser"), {
        path: `/${pulumi.getProject()}/${pulumi.getStack()}/application/`,
    });
    // Create Access Key
    const accessKey = new aws.iam.AccessKey(createNameTag("accessKey"), {
        user: iamUser.name,
    });
    const DynamoTable = DynamoTableFactory(iamUser);
    return {
        iamUser,
        accessKey,
        DynamoTable,
        NodeTable: ({
            nodeType,
            version,
            streamEnabled,
            streamViewType
        }:{
            nodeType: string, 
            version?: number
            streamEnabled?: boolean
            streamViewType?: "NEW_IMAGE" | "OLD_IMAGE" | "NEW_AND_OLD_IMAGES" | "KEYS_ONLY"
        }) => DynamoTable({
            tag: `${nodeType}_node`,
            version: version || 1,
            hashKey: "parentNodeId",
            rangeKey: "nodeId",
            attributes: [{
                name: "parentNodeId",
                type: "S"
            },{
                name: "nodeId",
                type: "S"
            }],
            streamEnabled,
            streamViewType
        }),
        getDynamoTable: getDynamoTableFactory(iamUser),
        VercelDeployment: VercelDeploymentFactory(accessKey),
        TsLambdaCallback: TsLambdaCallbackFactory(iamUser),
        PyLambdaCallback: PyLambdaCallbackFactory(iamUser),
        PyLambdaImage: PyLambdaImageFactory(iamUser)
    };
};
