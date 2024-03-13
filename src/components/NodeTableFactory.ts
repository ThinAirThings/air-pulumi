import { AirNode } from "@thinairthings/air-graph";
import { DynamoTableFactory } from "./DynamoTableFactory";



export const NodeTableFactory = (
    DynamoTable: ReturnType<typeof DynamoTableFactory>
) => <T extends AirNode<any, any>>(
    nodeType: T extends AirNode<any, infer U, any> ? U : never
    ,{
    version,
    streamEnabled,
    streamViewType
}: {
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
})