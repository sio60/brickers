from dataclasses import dataclass, field
from typing import List, Tuple, Optional, Any
import numpy as np

@dataclass
class Brick:
    id: str
    x: float
    y: float
    z: float
    width: float
    depth: float
    height: float
    mass: float = 1.0
    
    @property
    def center_of_mass(self) -> np.ndarray:
        return np.array([
            self.x + self.width / 2.0,
            self.y + self.depth / 2.0,
            self.z + self.height / 2.0
        ])
    
    @property
    def top_z(self) -> float:
        return self.z + self.height
        
    @property
    def volume(self) -> float:
        return self.width * self.depth * self.height

    @property
    def footprint_area(self) -> float:
        return self.width * self.depth

    @property
    def footprint_poly(self) -> List[Tuple[float, float]]:
        # (x, y) corners for geometric calculations
        return [
            (self.x, self.y),
            (self.x + self.width, self.y),
            (self.x + self.width, self.y + self.depth),
            (self.x, self.y + self.depth)
        ]

@dataclass
class Evidence:
    type: str        # 'FLOATING', 'UNSTABLE', 'WEAK_CONNECTION'
    severity: str    # 'CRITICAL', 'WARNING'
    brick_ids: List[str]
    message: str
    layer: Optional[int] = None

@dataclass
class VerificationResult:
    is_valid: bool = True
    score: float = 100.0
    evidence: List[Evidence] = field(default_factory=list)
    
    def add_hard_fail(self, evidence: Evidence):
        self.is_valid = False
        self.score = 0.0
        self.evidence.append(evidence)
        
    def add_penalty(self, evidence: Evidence, deduction: float):
        self.score = max(0.0, self.score - deduction)
        self.evidence.append(evidence)

class BrickPlan:
    def __init__(self, bricks: List[Brick]):
        self.bricks = {b.id: b for b in bricks}
        
    def get_all_bricks(self) -> List[Brick]:
        return list(self.bricks.values())
