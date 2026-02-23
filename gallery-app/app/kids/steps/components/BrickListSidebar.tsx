'use client';

import { BrickThumbnail } from "./OffscreenRenderer";
import styles from '../KidsStepPage.module.css';

interface BrickListSidebarProps {
    t: any;
    stepIdx: number;
    stepBricks: any[][];
}

export default function BrickListSidebar({ t, stepIdx, stepBricks }: BrickListSidebarProps) {
    return (
        <div className={styles.kidsStep__rightSidebar}>
            <div className={styles.kidsStep__rightSidebarHeader}>
                {t.kids.steps.tabBrick}
            </div>
            <div className={styles.kidsStep__brickList}>
                {stepBricks[stepIdx] && stepBricks[stepIdx].length > 0 ? (
                    stepBricks[stepIdx].map((brick: any, idx: number) => (
                        <div key={`${brick.partName}-${brick.color}-${idx}`} className={styles.kidsStep__brickItem}>
                            <div className={styles.kidsStep__brickCanvasContainer}>
                                <BrickThumbnail partName={brick.partName} color={brick.color} />
                            </div>
                            <div className={styles.kidsStep__brickCount}>x{brick.count}</div>
                        </div>
                    ))
                ) : (
                    <div className={styles.kidsStep__noBricks}>No new bricks this step</div>
                )}
            </div>
        </div>
    );
}
