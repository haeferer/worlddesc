import type {
  ObjectContainerPlacement,
  ObjectPlacement,
  RoomPlacement,
  WorldDocument
} from "../types.js";

export function validateObjectPlacements(world: WorldDocument, errors: string[]): void {
  for (const objectId of Object.keys(world.placement)) {
    if (!(objectId in world.objects)) {
      errors.push(`placement.${objectId} references unknown object "${objectId}"`);
    }
  }

  for (const objectId of Object.keys(world.objects)) {
    if (!(objectId in world.placement)) {
      errors.push(`objects.${objectId} has no initial placement entry in placement.${objectId}`);
    }
  }

  for (const [objectId, placement] of Object.entries(world.placement)) {
    validatePlacementReference(objectId, placement, world, errors);
  }

  detectPlacementCycles(world, errors);
}

function validatePlacementReference(
  objectId: string,
  placement: ObjectPlacement,
  world: WorldDocument,
  errors: string[]
): void {
  if (isRoomPlacement(placement) && !(placement.room in world.rooms)) {
    errors.push(`placement.${objectId}.room references unknown room "${placement.room}"`);
  }

  if ("inventory" in placement && placement.inventory !== "player") {
    errors.push(`placement.${objectId}.inventory must currently be "player"`);
  }

  if (isObjectPlacement(placement)) {
    if (!(placement.object in world.objects)) {
      errors.push(`placement.${objectId}.object references unknown object "${placement.object}"`);
      return;
    }

    if (placement.object === objectId) {
      errors.push(`placement.${objectId}.object cannot reference itself`);
    }
  }
}

function detectPlacementCycles(world: WorldDocument, errors: string[]): void {
  const visited = new Set<string>();
  const active = new Set<string>();

  for (const objectId of Object.keys(world.placement)) {
    visitPlacement(objectId, world, visited, active, errors);
  }
}

function visitPlacement(
  objectId: string,
  world: WorldDocument,
  visited: Set<string>,
  active: Set<string>,
  errors: string[]
): void {
  if (visited.has(objectId)) {
    return;
  }

  if (active.has(objectId)) {
    errors.push(`placement cycle detected at object "${objectId}"`);
    return;
  }

  const placement = world.placement[objectId];
  if (!placement) {
    return;
  }

  active.add(objectId);

  if (isObjectPlacement(placement)) {
    visitPlacement(placement.object, world, visited, active, errors);
  }

  active.delete(objectId);
  visited.add(objectId);
}

function isRoomPlacement(placement: ObjectPlacement): placement is RoomPlacement {
  return "room" in placement;
}

function isObjectPlacement(placement: ObjectPlacement): placement is ObjectContainerPlacement {
  return "object" in placement;
}
