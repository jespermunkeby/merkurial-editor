import type { CID, VersionedNode } from "@merkurial/common"

export class Store {
    store: Map<CID<any>, VersionedNode> = new Map()
    put(key: CID<any>, value: VersionedNode) {
        this.store.set(key, value)
    }
    get(key: CID<any>) {
        return this.store.get(key)
    }
}

