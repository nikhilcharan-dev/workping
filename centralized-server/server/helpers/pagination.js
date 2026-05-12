import { logger } from "#utils/logger.js";

const pagination = async (MODEL, page = 1, limit, filter = []) => {
  try {
    const count = await MODEL.aggregate([
      ...filter,
      {
        $count: "count",
      },
    ]);
    // console.log(filter)
    // console.log(count)

    const totalRecords = count[0]?.count || 0;
    const totalPages = Math.ceil(totalRecords / limit);

    if (!isNaN(Number(limit))) {
      page = Math.max(1, Number(page) || 1);
      limit = Math.max(1, Number(limit) || 10);
      const skip = (page - 1) * limit;
      filter.push({ $skip: skip });
      filter.push({ $limit: limit });
    }

    const documents = await MODEL.aggregate(filter);

    return {
      documents,
      totalRecords,
      totalPages,
    };
  } catch (err) {
    logger.error("Pagination query failed", { error: err.message });
    throw err;
  }
};
export default pagination;
