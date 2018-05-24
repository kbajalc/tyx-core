import { AuthMetadata } from "./auth";
import { META_TYX_API, Metadata } from "./common";
import { EventMetadata } from "./event";
import { HttpMetadata } from "./http";
import { ResolverMetadata } from "./resolver";
import { GraphType, StrucMetadata, TypeMetadata } from "./type";

export function Api(name?: string): ClassDecorator {
    return (target) => void ApiMetadata.define(target, name);
}

export interface ApiMetadata extends Metadata {
    api: string;

    authMetadata: Record<string, AuthMetadata>;
    inputMetadata: Record<string, TypeMetadata>;
    resultMetadata: Record<string, TypeMetadata>;
    resolverMetadata: Record<string, ResolverMetadata>;
    httpMetadata: Record<string, HttpMetadata>;
    eventMetadata: Record<string, EventMetadata[]>;
}

export namespace ApiMetadata {
    export function has(target: Function | Object): boolean {
        return Reflect.hasMetadata(META_TYX_API, target)
            || Reflect.hasMetadata(META_TYX_API, target.constructor);
    }

    export function get(target: Function | Object): ApiMetadata {
        return Reflect.getMetadata(META_TYX_API, target)
            || Reflect.getMetadata(META_TYX_API, target.constructor);
    }

    export function init(target: Function): ApiMetadata {
        let meta = get(target);
        if (!meta) {
            meta = Metadata.init(target) as ApiMetadata;
            meta.authMetadata = {};
            meta.inputMetadata = {};
            meta.resultMetadata = {};
            meta.resolverMetadata = {};
            meta.httpMetadata = {};
            meta.eventMetadata = {};
            Reflect.defineMetadata(META_TYX_API, meta, target);
        }
        return meta;
    }

    export function define(target: Function, name?: string): ApiMetadata {
        let meta = init(target);
        if (name) meta.name = meta.api = name;
        if (!meta.api) meta.name = meta.api = target.name;

        Object.values(meta.authMetadata).forEach(item => item.api = meta.api);
        Object.values(meta.resolverMetadata).forEach(item => item.api = meta.api);
        Object.values(meta.httpMetadata).forEach(item => item.api = meta.api);
        Object.values(meta.eventMetadata).forEach(item => item.forEach(h => h.api = meta.api));
        Object.values(meta.inputMetadata).forEach(item => item.api = meta.api);
        Object.values(meta.resultMetadata).forEach(item => item.api = meta.api);

        schema(target);

        return meta;
    }

    export function schema(target: Function | Object): string {
        let api = get(target);
        for (let res of Object.values(api.resolverMetadata)) {
            res.input = resolve(api, res.input, true);
            res.result = resolve(api, res.result, false);
        }
        return "# " + api.name;
    }

    export function resolve(api: ApiMetadata, meta: TypeMetadata, input: boolean): TypeMetadata {
        if (GraphType.isScalar(meta.type)) {
            meta.name = meta.type;
            return meta;
        }
        if (meta.target && input && api.inputMetadata[meta.target.name]) {
            return api.inputMetadata[meta.target.name];
        }
        if (meta.target && !input && api.resultMetadata[meta.target.name]) {
            return api.resultMetadata[meta.target.name];
        }
        if (GraphType.isRef(meta.type)) {
            let type = TypeMetadata.get(meta.target);
            if (type) {
                type = resolve(api, type, input);
                meta.name = type.name;
            } else {
                meta.name = GraphType.Object;
            }
            return meta;
        }
        if (GraphType.isList(meta.type)) {
            let type = resolve(api, meta.item, input);
            if (type) {
                meta.name = `[${type.name}]`;
            } else {
                meta.name = `[${GraphType.Object}]`;
            }
            return meta;
        }
        if (GraphType.isEntity(meta.type) && !input) {
            // TODO: Register imports
            meta.name = meta.target.name;
            return meta;
        }
        if (input && !GraphType.isInput(meta.type))
            throw new TypeError(`Input type can not reference [${meta.type}]`);

        if (!input && GraphType.isInput(meta.type))
            throw new TypeError(`Result type can not reference [${meta.type}]`);

        let struc = meta as StrucMetadata;
        if (!GraphType.isStruc(struc.type) || !struc.fields)
            throw new TypeError(`Empty type difinition ${struc.target}`);

        // Generate schema
        struc.name = struc.target.name;
        if (input) api.inputMetadata[struc.name] = struc; else api.resultMetadata[struc.name] = struc;
        let def = input ? `input ${struc.name} {\n` : `type ${struc.name} {\n`;
        for (let [key, field] of Object.entries(struc.fields)) {
            let res = resolve(api, field, input);
            def += `  ${key}: ${res.name}\n`;
        }
        def += "}";
        struc.schema = def;

        return meta;
    }
}