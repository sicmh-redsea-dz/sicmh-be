"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateShortenedUuid = void 0;
const uuid_1 = require("uuid");
const generateShortenedUuid = () => {
    const uuid = (0, uuid_1.v4)();
    const lastDashIndex = uuid.lastIndexOf('-');
    const secondLastDashIndex = uuid.lastIndexOf('-', lastDashIndex - 1);
    return uuid.substring(0, secondLastDashIndex);
};
exports.generateShortenedUuid = generateShortenedUuid;
