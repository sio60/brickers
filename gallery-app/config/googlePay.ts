export const GPAY_BUTTON_CONTAINER_ID = 'gpay-container';

export const merchantInfo = {
    merchantId: '12345678901234567890',
    merchantName: 'BRICKERS'
};

export const baseGooglePayRequest = {
    apiVersion: 2,
    apiVersionMinor: 0,
    allowedPaymentMethods: [
        {
            type: 'CARD',
            parameters: {
                allowedAuthMethods: [
                    "PAN_ONLY", "CRYPTOGRAM_3DS"
                ],
                allowedCardNetworks: [
                    "AMEX", "DISCOVER", "INTERAC", "JCB", "MASTERCARD", "VISA"
                ]
            },
            tokenizationSpecification: {
                type: 'PAYMENT_GATEWAY',
                parameters: {
                    gateway: 'example',
                    gatewayMerchantId: 'exampleGatewayMerchantId'
                }
            }
        }
    ],
    merchantInfo
};
