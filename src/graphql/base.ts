import { GraphQLField, GraphQLInterfaceType, GraphQLObjectType, GraphQLScalarType } from "graphql";
import { GraphQLDate, GraphQLDateTime, GraphQLTime } from "graphql-iso-date";
import { SchemaDirectiveVisitor } from "graphql-tools";
import GraphQLJSON = require("graphql-type-json");

export const SCALARS: Record<string, GraphQLScalarType> = {
    Date: GraphQLDate,
    Time: GraphQLTime,
    DateTime: GraphQLDateTime,
    JSON: GraphQLJSON,
    ANY: new GraphQLScalarType({
        name: "ANY",
        serialize(value) { return value; }
    })
};
export const DEF_SCALARS = Object.keys(SCALARS).map(s => `scalar ${s}`).join("\n");

export const DEF_DIRECTIVES = `
enum RelationType {
    OneToOne,
    OneToMany,
    ManyToOne
}
directive @metadata on OBJECT
directive @input on OBJECT
directive @result on OBJECT
directive @entity on OBJECT
directive @expression on OBJECT
directive @crud(auth: JSON) on FIELD_DEFINITION
directive @query(auth: JSON) on FIELD_DEFINITION
directive @mutation(auth: JSON) on FIELD_DEFINITION
directive @relation(type: RelationType) on FIELD_DEFINITION
`.trim();

export class QueryVisitor extends SchemaDirectiveVisitor {
    constructor(config) { super(config); }
    public visitFieldDefinition(field: GraphQLField<any, any>, details: {
        objectType: GraphQLObjectType | GraphQLInterfaceType;
    }): GraphQLField<any, any> | void {
        // let resolve = field.resolve;
        // field.resolve = async (obj, args, context, info) => {
        //     let res = await resolve.call(field, obj, args, context, info);
        //     // context.results = { [ww(info.path)]: res };
        //     return res;
        // };
    }
}

export class RelationVisitor extends SchemaDirectiveVisitor {
    public visitFieldDefinition(field: GraphQLField<any, any>, details: {
        objectType: GraphQLObjectType | GraphQLInterfaceType;
    }): GraphQLField<any, any> | void {
        // let resolve = field.resolve;
        // field.resolve = async (obj, args, context, info) => {
        //     let res = await resolve.call(field, obj, args, context, info);
        //     if (args.exists && res.length === 0) {
        //         let gp = ww(info.path.prev.prev);
        //         let ar = context.results[gp];
        //         delete ar[info.path.prev.key];
        //     } else {
        //         context.results[ww(info.path)] = res;
        //     }
        //     return res;
        // };
    }
}

export const DIRECTIVES = {
    // entity: ToolkitVisitor,
    // column: RelationVisitor,
    query: QueryVisitor,
    relation: RelationVisitor
};