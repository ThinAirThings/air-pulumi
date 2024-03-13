import { AirNode } from "@thinairthings/air-graph";
import { DynamoTableFactory } from "./DynamoTableFactory";



export const NodeTableFactory = (
    DynamoTable: ReturnType<typeof DynamoTableFactory>
) => <
    N extends AirNode<any, any>,
    T extends N extends AirNode<any, infer T> ? T : never,
>({
    nodeType,
    version,
    streamEnabled,
    streamViewType
}: {
    nodeType: T
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