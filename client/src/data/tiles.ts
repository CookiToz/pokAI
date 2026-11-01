// Tile catalogue shared by the art (drawing) and the world (maps) modules.
// Order matters: index in TILE_NAMES = frame index in the generated "tileset" texture.

export const TILE_NAMES = [
  'grass', 'grass_alt', 'path', 'sand', 'water', 'water_edge', 'cable', // cable = tall grass (wild encounters)
  'tree', 'bush', 'rock', 'flowers', 'fence', 'sign', 'ledge',
  'floor_wood', 'floor_lab', 'floor_tile', 'wall', 'wall_window', 'carpet',
  'house_wall', 'house_window', 'house_door', 'roof_red', 'roof_blue', 'roof_grey',
  'hub_wall', 'hub_door', 'hub_roof', 'store_wall', 'store_door', 'store_roof',
  'bench_wall', 'bench_door', 'bench_roof', // Benchmark (arena) building
  'counter', 'table', 'shelf', 'pc', 'server_rack', 'bed', 'plant',
  'dock', 'gpu_crate', 'lamp', 'poster_aiact', 'black', 'exit_mat',
  // v0.3 — city
  'asphalt', 'sidewalk', 'crosswalk', 'plaza', 'grass_park',
  'tower_wall', 'tower_roof', 'shop_wall', 'shop_window', 'shop_door', 'awning_red', 'awning_teal',
  'concrete_wall', 'aiact_wall', 'aiact_door',
  // v0.3 — landmarks: one big sprite drawn at the anchor tile; other footprint tiles use 'blocker'
  'lm_hf_hub', 'lm_bench_tower', 'lm_aiact_tower', 'lm_giant_screen', 'lm_gpu_store', 'blocker',
  // v0.3 — data highways
  'data_lane', 'data_bridge', 'data_stream', 'fiber', 'road_sign',
  // v0.3 — AIACT detention centre
  'cell_floor', 'cell_bars', 'prison_wall', 'locker', 'terminal', 'guard_desk', 'searchlight',
  // v0.3 — street props
  'street_lamp', 'bench_seat', 'planter', 'food_cart', 'billboard', 'traffic_cone', 'vending',
  // v0.4 — forest routes, signposts, puzzles
  'tree_pine', 'tree_birch', 'log', 'stump', 'flower_bed', 'bridge_wood', 'signpost',
  'switch_plate', 'gate', 'crate_push',
  // v0.4 — themed cities (port / grove) and stylish interiors
  'container_wall', 'container_roof', 'treehouse_wall', 'treehouse_roof',
  'hub_floor', 'hub_reception', 'repo_shelf', 'arena_floor', 'arena_line', 'scoreboard',
  'lm_crane', 'lm_lighthouse', 'lm_great_tree',
] as const;

export type TileName = (typeof TILE_NAMES)[number];

export const SOLID_TILES: ReadonlySet<TileName> = new Set<TileName>([
  'water', 'water_edge', 'tree', 'rock', 'fence', 'sign', 'wall', 'wall_window',
  'house_wall', 'house_window', 'roof_red', 'roof_blue', 'roof_grey',
  'hub_wall', 'hub_roof', 'store_wall', 'store_roof', 'bench_wall', 'bench_roof',
  'counter', 'table', 'shelf', 'pc', 'server_rack', 'bed', 'plant', 'gpu_crate',
  'lamp', 'poster_aiact', 'black', 'bush',
  'tower_wall', 'tower_roof', 'shop_wall', 'shop_window', 'awning_red', 'awning_teal', 'concrete_wall', 'aiact_wall',
  'lm_hf_hub', 'lm_bench_tower', 'lm_aiact_tower', 'lm_giant_screen', 'lm_gpu_store', 'blocker',
  'data_lane', 'fiber', 'road_sign', 'cell_bars', 'prison_wall', 'locker', 'terminal', 'guard_desk', 'searchlight',
  'street_lamp', 'bench_seat', 'planter', 'food_cart', 'billboard', 'traffic_cone', 'vending',
  'tree_pine', 'tree_birch', 'log', 'stump', 'signpost', 'gate', 'crate_push',
  'container_wall', 'container_roof', 'treehouse_wall', 'treehouse_roof', 'hub_reception', 'repo_shelf', 'scoreboard',
  'lm_crane', 'lm_lighthouse', 'lm_great_tree',
]);

export const ENCOUNTER_TILES: ReadonlySet<TileName> = new Set<TileName>(['cable', 'data_stream']);

/**
 * Landmark footprints in tiles (gx extent w, gy extent h). The landmark char sits on the ANCHOR = the front corner
 * of the footprint (max gx, max gy); every other footprint tile must be 'blocker'. Entrances/warps go in front of it.
 */
export const LANDMARK_FOOTPRINT: Readonly<Partial<Record<TileName, { w: number; h: number }>>> = {
  lm_hf_hub: { w: 5, h: 5 },
  lm_bench_tower: { w: 4, h: 4 },
  lm_aiact_tower: { w: 4, h: 4 },
  lm_giant_screen: { w: 3, h: 1 },
  lm_gpu_store: { w: 3, h: 3 },
  lm_crane: { w: 3, h: 3 },
  lm_lighthouse: { w: 2, h: 2 },
  lm_great_tree: { w: 6, h: 6 },
};

export const TILE_SIZE = 16;
