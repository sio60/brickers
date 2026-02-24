package com.brickers.backend.job.entity;

/**
 * Kids 난이도(연령대/복잡도)
 *
 * LEVEL_1 : 가장 쉬움 (유아/초등 저학년)
 * LEVEL_2 : 보통
 * LEVEL_3 : 가장 어려움 (고학년)
 * PRO : 전문가 모드 (고해상도/대량 브릭)
 */
public enum KidsLevel {
    LEVEL_1,
    LEVEL_2,
    LEVEL_3,
    PRO;

    public static KidsLevel fromAge(String age) {
        if (age == null || age.isBlank())
            return LEVEL_1;
        String clean = age.replaceAll("[^a-zA-Z0-9]", "").toLowerCase();
        return switch (clean) {
            case "45", "35" -> LEVEL_1;
            case "67" -> LEVEL_2;
            case "810" -> LEVEL_3;
            case "pro" -> PRO;
            default -> LEVEL_1;
        };
    }
}
