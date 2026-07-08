const prisma = require('../../config/prisma');
const { sendSuccess, sendError } = require('../../shared/utils/response');

exports.getSettings = async (req, res, next) => {
  try {
    const userId = req.user.id || req.user._id;
    let settings = await prisma.settings.findUnique({ where: { userId } });
    if (!settings) {
      settings = await prisma.settings.create({ data: { userId } });
    }
    sendSuccess(res, 'Settings fetched successfully', settings);
  } catch (error) {
    console.error('Get Settings Error:', error);
    sendError(res, 'Failed to fetch settings', 500);
  }
};

exports.updateSettings = async (req, res, next) => {
  try {
    const userId = req.user.id || req.user._id;
    const { companyDomain, teamMembers, departmentKeywords, replyTone, signature, language, autoCategorization, autoSync, autoSyncIntervalMinutes } = req.body;
    
    const data = {};
    if (companyDomain !== undefined) data.companyDomain = companyDomain;
    if (teamMembers !== undefined) data.teamMembers = teamMembers;
    if (departmentKeywords !== undefined) data.departmentKeywords = departmentKeywords;
    if (replyTone !== undefined) data.replyTone = replyTone;
    if (signature !== undefined) data.signature = signature;
    if (language !== undefined) data.language = language;
    if (autoCategorization !== undefined) data.autoCategorization = autoCategorization;
    if (autoSync !== undefined) data.autoSync = autoSync;
    if (autoSyncIntervalMinutes !== undefined) data.autoSyncIntervalMinutes = autoSyncIntervalMinutes;

    const settings = await prisma.settings.upsert({
      where: { userId },
      update: data,
      create: { userId, ...data }
    });

    sendSuccess(res, 'Settings updated successfully', settings);
  } catch (error) {
    console.error('Update Settings Error:', error);
    sendError(res, 'Failed to update settings', 500);
  }
};
