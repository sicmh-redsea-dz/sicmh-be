import { v4 as uuidv4 } from 'uuid';

export const generateShortenedUuid = (): string => {
    const uuid = uuidv4();
    const lastDashIndex = uuid.lastIndexOf('-')
    const secondLastDashIndex = uuid.lastIndexOf('-', lastDashIndex - 1)
    return uuid.substring(0, secondLastDashIndex)
}