from typing import Dict, List, Any

class UnionFind:
    def __init__(self, elements: List[Any]):
        self.parent: Dict[Any, Any] = {x: x for x in elements}
        self.rank: Dict[Any, int] = {x: 0 for x in elements}

    def find(self, x: Any) -> Any:
        if self.parent[x] != x:
            self.parent[x] = self.find(self.parent[x])
        return self.parent[x]

    def union(self, x: Any, y: Any):
        root_x = self.find(x)
        root_y = self.find(y)
        if root_x == root_y:
            return
        if self.rank[root_x] < self.rank[root_y]:
            self.parent[root_x] = root_y
        elif self.rank[root_x] > self.rank[root_y]:
            self.parent[root_y] = root_x
        else:
            self.parent[root_y] = root_x
            self.rank[root_x] += 1

    def get_groups(self) -> Dict[Any, List[Any]]:
        groups: Dict[Any, List[Any]] = {}
        for elem in self.parent:
            root = self.find(elem)
            if root not in groups:
                groups[root] = []
            groups[root].append(elem)
        return groups
