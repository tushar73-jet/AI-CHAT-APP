const prisma = require('../config/prisma');

function startCleanupJob() {
  setInterval(async () => {
    const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    try {
      await prisma.message.deleteMany({
        where: { createdAt: { lt: cutoff } }
      });
      console.log("Old messages deleted");
    } catch (err) {
      console.error("Cleanup error:", err);
    }
  }, 60 * 60 * 1000);
}


module.exports = {
  startCleanupJob
};
