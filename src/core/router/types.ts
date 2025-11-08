export type RouteModule = {
  routePath: string
  module: Record<string, unknown>
}

export interface RouteLoader {
  load(): AsyncGenerator<RouteModule>
}
