import logging
from shapely.geometry import Polygon, LineString, MultiLineString, Point, GeometryCollection
from shapely.ops import unary_union

logger = logging.getLogger(__name__)


def generate_grid_path(polygon_coords, spacing=60):
    """Generate a simple lawnmower/grid path over provided polygon coordinates.

    This function is defensive: it handles Point/MultiLineString/GeometryCollection
    intersections, avoids crashing on degenerate or invalid polygons and logs
    cases where intersections are empty so callers can diagnose inputs.
    """
    # Build polygon safely
    try:
        poly = Polygon([(lng, lat) for lng, lat in polygon_coords])
    except Exception as exc:
        logger.exception("Failed to construct polygon from coords: %s", exc)
        return []

    if poly.is_empty:
        logger.warning("Generated polygon is empty — returning no path")
        return []

    # Try to fix invalid geometry
    if not poly.is_valid:
        try:
            poly = poly.buffer(0)
            if not poly.is_valid or poly.is_empty:
                logger.warning("Polygon invalid after buffer(0): %s", polygon_coords)
                return []
        except Exception:
            logger.exception("Error while trying to fix invalid polygon")
            return []

    # If polygon is degenerate (very small area) bail out
    if poly.area == 0:
        logger.warning("Degenerate polygon with zero area — skipping path generation")
        return []

    minx, miny, maxx, maxy = poly.bounds

    # Convert spacing (meters-ish) to degree step approximation
    step = spacing * 0.00001

    paths = []
    y = miny
    reverse = False

    while y <= maxy:
        line = LineString([(minx, y), (maxx, y)])
        try:
            intersection = poly.intersection(line)
        except Exception:
            logger.exception("Intersection failed for y=%s", y)
            y += step
            continue

        if intersection.is_empty:
            # Log minimally so callers can detect empty intersections
            logger.debug("Empty intersection at y=%.8f (step=%.8f)", y, step)
            y += step
            reverse = not reverse
            continue

        # -------------------------------
        # SAFE GEOMETRY TYPE HANDLING
        # -------------------------------
        collected = []

        if isinstance(intersection, LineString):
            collected = list(intersection.coords)

        elif isinstance(intersection, MultiLineString):
            for seg in intersection:
                collected.extend(list(seg.coords))

        elif isinstance(intersection, GeometryCollection):
            for geom in intersection.geoms:
                if isinstance(geom, LineString):
                    collected.extend(list(geom.coords))

        elif isinstance(intersection, Point):
            # A single point is not useful as a path segment — skip
            collected = []

        else:
            logger.debug("Unhandled geometry type from intersection: %s", type(intersection))

        if not collected:
            y += step
            reverse = not reverse
            continue

        # Merge and order segments left-to-right (or reversed) for lawnmower
        try:
            # Use unary_union to combine and then gather LineString coords in deterministic order
            # This handles overlapping segments gracefully
            merged = unary_union([LineString(collected)])
            if isinstance(merged, LineString):
                coords = list(merged.coords)
            else:
                coords = []
                for geom in getattr(merged, 'geoms', []):
                    if isinstance(geom, LineString):
                        coords.extend(list(geom.coords))
        except Exception:
            coords = collected

        if reverse:
            coords.reverse()

        paths.extend(coords)

        reverse = not reverse
        y += step

    # Remove duplicates while preserving order
    seen = set()
    ordered = []
    for lng, lat in paths:
        key = (round(lng, 8), round(lat, 8))
        if key in seen:
            continue
        seen.add(key)
        ordered.append({"lat": lat, "lng": lng})

    if not ordered:
        logger.info("No path coordinates generated for polygon; check input geometry")

    return ordered


def generate_crosshatch_path(polygon_coords, spacing=60):
    """Generate a crosshatch (grid + diagonal) path over polygon.

    Creates a grid pattern like generate_grid_path, then adds diagonal passes
    for better coverage.
    """
    try:
        poly = Polygon([(lng, lat) for lng, lat in polygon_coords])
    except Exception as exc:
        logger.exception("Failed to construct polygon for crosshatch: %s", exc)
        return []

    if poly.is_empty or not poly.is_valid:
        logger.warning("Polygon invalid for crosshatch path generation")
        return []

    if poly.area == 0:
        logger.warning("Degenerate polygon - skipping crosshatch")
        return []

    minx, miny, maxx, maxy = poly.bounds
    step = spacing * 0.00001

    paths = []
    reverse = False

    # First: horizontal lines (grid pattern)
    y = miny
    while y <= maxy:
        line = LineString([(minx, y), (maxx, y)])
        try:
            intersection = poly.intersection(line)
        except Exception:
            y += step
            continue

        if intersection.is_empty:
            y += step
            continue

        collected = []
        if isinstance(intersection, LineString):
            collected = list(intersection.coords)
        elif isinstance(intersection, MultiLineString):
            for seg in intersection:
                collected.extend(list(seg.coords))
        elif isinstance(intersection, GeometryCollection):
            for geom in intersection.geoms:
                if isinstance(geom, LineString):
                    collected.extend(list(geom.coords))

        if collected:
            if reverse:
                collected.reverse()
            paths.extend(collected)
            reverse = not reverse

        y += step

    # Second: diagonal lines (NE-SW direction)
    # Create lines at 45-degree angle
    diagonal_step = spacing * 0.00001 * 1.414  # sqrt(2) for diagonal spacing
    diag_x = minx
    reverse = False

    while diag_x <= maxx:
        # Create diagonal line (45 degrees)
        # Line goes from (diag_x, miny) to (maxx, miny + (maxx - diag_x))
        p1 = (diag_x, miny)
        p2 = (maxx, min(maxy, miny + (maxx - diag_x)))
        line = LineString([p1, p2])

        try:
            intersection = poly.intersection(line)
        except Exception:
            diag_x += diagonal_step
            continue

        if intersection.is_empty:
            diag_x += diagonal_step
            continue

        collected = []
        if isinstance(intersection, LineString):
            collected = list(intersection.coords)
        elif isinstance(intersection, MultiLineString):
            for seg in intersection:
                collected.extend(list(seg.coords))
        elif isinstance(intersection, GeometryCollection):
            for geom in intersection.geoms:
                if isinstance(geom, LineString):
                    collected.extend(list(geom.coords))

        if collected:
            if reverse:
                collected.reverse()
            paths.extend(collected)
            reverse = not reverse

        diag_x += diagonal_step

    # Remove duplicates
    seen = set()
    ordered = []
    for lng, lat in paths:
        key = (round(lng, 8), round(lat, 8))
        if key in seen:
            continue
        seen.add(key)
        ordered.append({"lat": lat, "lng": lng})

    return ordered


def generate_perimeter_path(polygon_coords, offset_distance=20):
    """Generate a perimeter (boundary) path around the polygon.

    Creates a path that follows the edges of the polygon, useful for
    border inspection or surveillance.
    """
    try:
        poly = Polygon([(lng, lat) for lng, lat in polygon_coords])
    except Exception as exc:
        logger.exception("Failed to construct polygon for perimeter: %s", exc)
        return []

    if poly.is_empty or not poly.is_valid:
        logger.warning("Polygon invalid for perimeter path generation")
        return []

    if poly.area == 0:
        logger.warning("Degenerate polygon - skipping perimeter")
        return []

    # Use the exterior ring
    exterior = poly.exterior
    coords = list(exterior.coords)

    # Optional: add an inward offset ring for multi-layer coverage
    try:
        # Convert offset distance (meters approximation) to degrees
        offset_deg = (offset_distance / 111000.0)  # ~111 km per degree
        inset_poly = poly.buffer(-offset_deg)
        if inset_poly and not inset_poly.is_empty:
            try:
                inset_exterior = inset_poly.exterior
                coords.extend(list(inset_exterior.coords))
            except Exception:
                pass
    except Exception:
        pass

    # Convert to lat/lng format
    result = []
    seen = set()
    for lng, lat in coords:
        key = (round(lng, 8), round(lat, 8))
        if key in seen:
            continue
        seen.add(key)
        result.append({"lat": lat, "lng": lng})

    if not result:
        logger.info("No perimeter coordinates generated")

    return result
