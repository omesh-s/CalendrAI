export  function parseISODuration(duration: any) {
    const regex = /P(?:([0-9]+)Y)?(?:([0-9]+)M)?(?:([0-9]+)D)?T(?:([0-9]+)H)?(?:([0-9]+)M)?(?:([0-9]+)S)?/;
    const matches = duration.match(regex);
  
    return {
      years: parseInt(matches[1] || 0),
      months: parseInt(matches[2] || 0),
      days: parseInt(matches[3] || 0),
      hours: parseInt(matches[4] || 0),
      minutes: parseInt(matches[5] || 0),
      seconds: parseInt(matches[6] || 0),
    };
  }
  
export  function formatDuration({ years, months, days, hours, minutes, seconds }: any) {
    let totalSeconds =
      (years * 31536000) +
      (months * 2592000) +
      (days * 86400) +
      (hours * 3600) +
      (minutes * 60) +
      seconds;
  
    let resultHours = Math.floor(totalSeconds / 3600);
    totalSeconds %= 3600;
    let resultMinutes = Math.floor(totalSeconds / 60);
    let resultSeconds = totalSeconds % 60;
  
    return `${String(resultHours).padStart(2, '0')}:${String(resultMinutes).padStart(2, '0')}:${String(resultSeconds).padStart(2, '0')}`;
  }

