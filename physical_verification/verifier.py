import networkx as nx
import numpy as np
from scipy.spatial import ConvexHull
from typing import List, Dict, Set
try:
    from .models import Brick, BrickPlan, VerificationResult, Evidence
except ImportError:
    from models import Brick, BrickPlan, VerificationResult, Evidence

class PhysicalVerifier:
    def __init__(self, plan: BrickPlan):
        self.plan = plan
        self.graph = nx.Graph()
        self._build_graph()

    def _build_graph(self):
        """Builds a connectivity graph where nodes are bricks and edges denote physical contact."""
        bricks = self.plan.get_all_bricks()
        for b in bricks:
            self.graph.add_node(b.id, brick=b)
            
        # Naive N^2 check for connections (optimize with spatial hash later if needed)
        # Assuming bricks are axis-aligned boxes
        for i, b1 in enumerate(bricks):
            for b2 in bricks[i+1:]:
                if self._are_connected(b1, b2):
                    self.graph.add_edge(b1.id, b2.id)

    def _are_connected(self, b1: Brick, b2: Brick) -> bool:
        """Check if two bricks touch."""
        TOL = 0.05

        # 0. Intersection (Parts inside each other, e.g. Tyre on Rim)
        # Check if they share volume
        intersect_x = max(0, min(b1.x + b1.width, b2.x + b2.width) - max(b1.x, b2.x))
        intersect_y = max(0, min(b1.y + b1.depth, b2.y + b2.depth) - max(b1.y, b2.y))
        intersect_z = max(0, min(b1.z + b1.height, b2.z + b2.height) - max(b1.z, b2.z))
        
        # If significant volume intersection, they are connected
        if intersect_x > TOL and intersect_y > TOL and intersect_z > TOL:
             return True

        # 1. Vertical Touch (Z-stacking)
        vertical_touch = (abs((b1.z + b1.height) - b2.z) < TOL) or (abs((b2.z + b2.height) - b1.z) < TOL)
        if vertical_touch:
             if self._compute_overlap_area(b1, b2) > 0:
                 return True

        # 2. Lateral Touch (Horizontal connectivity)
        # Check Z overlap first
        z_overlap_start = max(b1.z, b2.z)
        z_overlap_end = min(b1.z + b1.height, b2.z + b2.height)
        z_overlap = z_overlap_end - z_overlap_start
        
        if z_overlap > TOL: # Significant Z overlap (> 0.05)
             # Check X-touch (touching on Left/Right faces)
             # Overlap in Y?
             y_overlap_start = max(b1.y, b2.y)
             y_overlap_end = min(b1.y + b1.depth, b2.y + b2.depth)
             if (y_overlap_end - y_overlap_start) > TOL:
                 # Touching in X?
                 x_touch = (abs((b1.x + b1.width) - b2.x) < TOL) or (abs((b2.x + b2.width) - b1.x) < TOL)
                 if x_touch: return True
                    
        # 3. Snap Tolerance (Magnet Mode for imperfect LDraw)
        # If Horizontal Overlap is significant (> 0.5 * min_area), allow Vertical Gap up to 1.0 Brick
        dx = min(b1.x + b1.width, b2.x + b2.width) - max(b1.x, b2.x)
        dy = min(b1.y + b1.depth, b2.y + b2.depth) - max(b1.y, b2.y)
        
        if dx > 0.05 and dy > 0.05:
            overlap_area = dx * dy
            min_area = min(b1.width * b1.depth, b2.width * b2.depth)
            
            # If overlap area is significant (e.g. > 10% of smaller brick or absolute > 0.5 stud)
            if overlap_area > 0.5:
                # Check Vertical Gap
                gap = min(abs(b1.z - (b2.z + b2.height)), abs(b2.z - (b1.z + b1.height)))
                if gap < 1.0: # Allow up to 1 brick gap (e.g. 0.833)
                    return True

        # Check Y-touch (touching on Front/Back faces)
        # Overlap in X?
        x_overlap_start = max(b1.x, b2.x)
        x_overlap_end = min(b1.x + b1.width, b2.x + b2.width)
        if (x_overlap_end - x_overlap_start) > TOL:
            # Touching in Y?
            if (abs((b1.y + b1.depth) - b2.y) < TOL) or (abs((b2.y + b2.depth) - b1.y) < TOL):
                return True
                     
        return False

    def _compute_overlap_area(self, b1: Brick, b2: Brick) -> float:
        """Returns the area of overlap between b1 (below) and b2 (above) on XY plane."""
        # Intersection of rectangles
        dx = min(b1.x + b1.width, b2.x + b2.width) - max(b1.x, b2.x)
        dy = min(b1.y + b1.depth, b2.y + b2.depth) - max(b1.y, b2.y)
        if dx > 0 and dy > 0:
            return dx * dy
        return 0.0

    def verify_floating(self, result: VerificationResult):
        """Checks for bricks not connected to the ground (z=0)."""
        ground_nodes = [
            bid for bid, attr in self.graph.nodes(data=True)
            if attr['brick'].z < 0.1 # Relaxed ground check (was isclose to 0.0)
        ]
        
        if not ground_nodes:
            result.add_hard_fail(Evidence(
                type="FLOATING", 
                severity="CRITICAL", 
                brick_ids=[], 
                message="No bricks found on the ground layer (z=0)."
            ))
            return

        # Find all nodes connected to ground
        connected_to_ground = set()
        for g_node in ground_nodes:
             # BFS/DFS to find component
             component = nx.node_connected_component(self.graph, g_node)
             connected_to_ground.update(component)
             
        all_nodes = set(self.graph.nodes())
        floating_nodes = all_nodes - connected_to_ground
        
        if floating_nodes:
            print("\n--- FLOATING BRICK DIAGNOSTICS ---")
            bricks = self.plan.get_all_bricks()
            for fid in floating_nodes:
                fb = self.plan.bricks[fid]
                print(f"\n[DIAGNOSTIC] Brick {fid} at ({fb.x:.2f}, {fb.y:.2f}, {fb.z:.2f}) H={fb.height:.2f}")
                
                # Check near bricks
                for other in bricks:
                     if other.id == fid: continue
                     
                     # Check Vertical Gap
                     gap_below = fb.z - (other.z + other.height)
                     if abs(gap_below) < 1.0:
                         print(f"  -> Near BELOW: {other.id} Top={other.z + other.height:.2f} (Gap={gap_below:.4f})")
                         
                         # Check Horizontal Overlap
                         dx = min(fb.x + fb.width, other.x + other.width) - max(fb.x, other.x)
                         dy = min(fb.y + fb.depth, other.y + other.depth) - max(fb.y, other.y)
                         if dx > 0.05 and dy > 0.05:
                             print(f"     [Horizontal Overlap OK] dx={dx:.2f}, dy={dy:.2f}")
                             # If gap is small, why not connected?
                             if abs(gap_below) < 0.05:
                                 print(f"     [Vertical Touch OK] Should be connected! Graph edge missing?")
                             else:
                                 print(f"     [Vertical Gap FAIL] Gap {gap_below:.4f} > 0.05")
                         else:
                             print(f"     [Horizontal Overlap FAIL] dx={dx:.2f}, dy={dy:.2f}")
                     
                     # Check Intersection
                     ix = min(fb.x + fb.width, other.x + other.width) - max(fb.x, other.x)
                     iy = min(fb.y + fb.depth, other.y + other.depth) - max(fb.y, other.y)
                     iz = min(fb.z + fb.height, other.z + other.height) - max(fb.z, other.z)
                     
                     if ix > 0.05 and iy > 0.05 and iz > 0.05:
                         print(f"  -> INTERSECT: {other.id} overlaps by ({ix:.2f}, {iy:.2f}, {iz:.2f})")
            print("----------------------------------\n")
            result.add_hard_fail(Evidence(
                type="FLOATING",
                severity="CRITICAL",
                brick_ids=list(floating_nodes),
                message=f"Found {len(floating_nodes)} floating bricks. Details: " + ", ".join(
                    [f"{bid}(Pos:{self.plan.bricks[bid].x:.2f},{self.plan.bricks[bid].y:.2f},{self.plan.bricks[bid].z:.2f} Size:{self.plan.bricks[bid].width:.2f}x{self.plan.bricks[bid].depth:.2f}x{self.plan.bricks[bid].height:.2f})" 
                     for bid in floating_nodes]
                )
            ))

    def verify_stability(self, result: VerificationResult, strict_mode: bool = False):
        """
        Checks stability by calculating Center of Mass (COM) for each connected component 
        and ensuring it falls within the Convex Hull of its contact base.
        Uses a recursive approach from top to bottom logic or component logic.
        """
        # Simplified: Check the entire structure's COM vs Base Convex Hull (Global Stability)
        # Real implementation needs recursive sub-structure check.
        
        # 1. Calculate Global COM
        bricks = self.plan.get_all_bricks()
        total_mass = sum(b.mass for b in bricks)
        if total_mass == 0: return

        weighted_pos = np.zeros(3)
        for b in bricks:
            weighted_pos += b.center_of_mass * b.mass
        
        global_com = weighted_pos / total_mass
        
        # 2. Get Ground Contact Points (Base)
        ground_bricks = [b for b in bricks if np.isclose(b.z, 0.0)]
        if not ground_bricks:
            return # Already handled by floating check
            
        points = []
        for b in ground_bricks:
            points.extend(b.footprint_poly)
        
        points = np.array(points)
        if len(points) < 3:
            # 1 or 2 points cannot form a hull, highly unstable if mass is not exactly on line
            # For 1x1 brick on ground, it's stable. simplified check:
            # check if COM is within bounding box of ground bricks
            min_x, min_y = np.min(points, axis=0)
            max_x, max_y = np.max(points, axis=0)
            stable = (min_x <= global_com[0] <= max_x) and (min_y <= global_com[1] <= max_y)
            if not stable:
                 result.add_penalty(Evidence("UNSTABLE", "WARNING", [], "Global COM outside base bounds."), 50)
            return

        # 3. Convex Hull Check
        try:
            hull = ConvexHull(points)
            # Check if COM (x,y) is inside hull
            # Optimization: Use hull.equations to check distance to planes
            # A point is inside if dot(normal, point) + offset <= 0 for all planes
            
            # Scipy ConvexHull is 2D if inputs are 2D.
            # points is List[(x,y)], so it works.
            
            in_hull = True
            for eq in hull.equations:
                # eq is [a, b, offset], we check a*x + b*y + offset <= 0
                if eq[0]*global_com[0] + eq[1]*global_com[1] + eq[2] > 1e-6: # Epsilon
                    in_hull = False
                    break
            
            if not in_hull:
                result.add_hard_fail(Evidence(
                    type="UNSTABLE",
                    severity="CRITICAL",
                    brick_ids=[],
                    message="Global Center of Mass is outside the support base polygon. The model will topple."
                ))
                
        except Exception as e:
            # Flat geometry or error
            print(f"Hull Error: {e}")

    def verify_connection_strength(self, result: VerificationResult, strict_mode: bool = False):
        """
        Checks for weak connections, specifically 1-stud connections.
        strict_mode (Kids Mode): Hard Fail on 1-stud connection.
        Normal Mode: Warning.
        """
        bricks = self.plan.get_all_bricks()
        for i, b1 in enumerate(bricks):
            for b2 in bricks[i+1:]:
                # Only check if they are vertically connected (one on top of another)
                # b2 on b1 or b1 on b2
                is_b2_on_b1 = abs((b1.z + b1.height) - b2.z) < 0.1
                is_b1_on_b2 = abs((b2.z + b2.height) - b1.z) < 0.1
                
                if not (is_b2_on_b1 or is_b1_on_b2):
                    continue
                    
                overlap_area = self._compute_overlap_area(b1, b2)
                
                # Assuming 1x1 stud area is approx 1.0 unit^2 (adjust based on unit scale)
                if 0 < overlap_area <= 1.0 + 1e-6: # 1 stud or less
                    msg = f"Weak connection (1-stud) detected between {b1.id} and {b2.id}."
                    
                    # Logic: If 1-stud connection, check if it's the ONLY connection for top brick?
                    # Ideally, check all connections for the top brick. 
                    # But per-pair check is a good starting point for 'local weakness'.
                    
                    evidence = Evidence(
                        type="WEAK_CONNECTION",
                        severity="CRITICAL" if strict_mode else "WARNING",
                        brick_ids=[b1.id, b2.id],
                        message=msg,
                        layer=int(max(b1.z, b2.z))
                    )
                    
                    if strict_mode:
                        result.add_hard_fail(evidence)
                    else:
                        result.add_penalty(evidence, 10.0)

    def verify_overhang(self, result: VerificationResult, mode: str = "ADULT"):
        """
        Checks if a brick is sufficiently supported by bricks below it.
        Kids Mode: Needs > 50% support.
        Adult Mode: Needs > 30% support.
        """
        threshold_ratio = 0.5 if mode == "KIDS" else 0.3
        
        bricks = self.plan.get_all_bricks()
        # Sort by z so we process bottom-up (though order doesn't strictly matter for per-brick check)
        bricks_sorted = sorted(bricks, key=lambda b: b.z)
        
        for top_brick in bricks_sorted:
            if np.isclose(top_brick.z, 0.0):
                continue # Ground bricks are 100% supported
                
            # Find all bricks directly below this brick
            supporting_bricks = []
            for potential_support in bricks:
                if np.isclose(potential_support.z + potential_support.height, top_brick.z):
                    if self._compute_overlap_area(potential_support, top_brick) > 0:
                        supporting_bricks.append(potential_support)
            
            # Calculate total supported area
            total_supported_area = 0.0
            for support in supporting_bricks:
                total_supported_area += self._compute_overlap_area(support, top_brick)
                
            support_ratio = total_supported_area / top_brick.volume * top_brick.height # volume/height = footprint area
            # Improved area calc: top_brick.width * top_brick.depth
            brick_area = top_brick.width * top_brick.depth
            if brick_area > 0:
                support_ratio = total_supported_area / brick_area
            else:
                support_ratio = 0 # Should not happen
                
            if support_ratio < threshold_ratio:
                 # Check if floating (ratio 0) or just overhang
                 if support_ratio < 1e-6:
                     pass # Already handled by Floating Check (conceptually), but good to flag here too via Overhang logic?
                          # Existing floating check is graph-based connectivity. 
                          # This is area-based. Let's focus on Partial Overhang here.
                 else:
                     msg = f"Dangerous Overhang: Brick {top_brick.id} only supported {support_ratio*100:.1f}% (Required > {threshold_ratio*100}%)."
                     result.add_penalty(
                         Evidence("OVERHANG", "WARNING", [top_brick.id], msg, layer=int(top_brick.z)), 
                         20.0
                     )
                     if mode == "KIDS": # Kids mode stricter? Or just penalty? Task says Fail.
                         result.add_hard_fail(Evidence("OVERHANG", "CRITICAL", [top_brick.id], msg, layer=int(top_brick.z)))

    def run_all_checks(self, mode: str = "ADULT") -> VerificationResult:
        result = VerificationResult()
        
        # 1. Floating (Essential)
        self.verify_floating(result)
        if not result.is_valid: 
            return result # Stop if floating (critical)
            
        # 2. Stability (Global Gravity)
        self.verify_stability(result)
        
        # 3. Connection Strength (Local Joint)
        strict_mode = (mode == "KIDS")
        self.verify_connection_strength(result, strict_mode=strict_mode)
        
        # 4. Overhang (Local Gravity)
        self.verify_overhang(result, mode=mode)
        
        return result
