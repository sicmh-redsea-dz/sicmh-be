"use strict";
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ScheduleController = void 0;
const googleapis_1 = require("googleapis");
class ScheduleController {
}
exports.ScheduleController = ScheduleController;
_a = ScheduleController;
ScheduleController.scheduleEvent = async (req, res, next) => {
    const { summary, description, startTime, endTime } = req.body;
    const oauth2Client = new googleapis_1.google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: 'ya29.a0AeXRPp5PAfgoWe-GD_D4b0m7M4kbMCL5c0fHGp2fhbjzGojgrc1W6KFO4-QZG4YL-OI1dzhuTxUUG3NhDs9RgK4lnOlUd7mzVxd7jhf1mIxtrGLDqgKeB9bQ3LJqcI2BAHrqAsqC1JLMuN1CM_LYw8ta67phCE_TMJTuEfd4jQaCgYKAbASARMSFQHGX2MiMiRvi08CFvC8I16ViMtUAQ0177' });
    const calendar = googleapis_1.google.calendar({ version: 'v3', auth: oauth2Client });
    const event = {
        summary,
        description,
        start: { dateTime: startTime, timeZone: 'America/New_York' },
        end: { dateTime: endTime, timeZone: 'America/New_York' },
    };
    try {
        const response = await calendar.events.insert({
            calendarId: 'primary',
            requestBody: event
        });
        res.status(200).json({
            msg: 'event created',
            resource: response
        });
    }
    catch (err) {
        console.log('the error: ', err);
        next(err);
    }
};
