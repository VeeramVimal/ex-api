exports.addDays = async function (data={}) {
    let {
        startDate, days
    } = data;
    startDate = new Date(startDate);
    startDate.setDate(startDate.getDate() + days);
    startDate = new Date(startDate);
    return startDate;
}