import { PrinterLog } from '../models/printerModels.js';

export const getPrinterLogs = async (req, res, next) => {
  try {
    const logs = await PrinterLog.findAll();
    res.json(logs);
  } catch (error) {
    next(error);
  }
};

export const getPrinterLogById = async (req, res, next) => {
  try {
    const log = await PrinterLog.findById(req.params.id);
    if (!log) return res.status(404).json({ message: 'Printer log not found' });
    res.json(log);
  } catch (error) {
    next(error);
  }
};

export const createPrinterLog = async (req, res, next) => {
  try {
    const { product_name, serial_number, total_impressions, created_at } = req.body;
    const newLog = await PrinterLog.create({
      product_name,
      serial_number,
      total_impressions,
      ...(created_at && { created_at })
    });
    res.status(201).json(newLog);
  } catch (error) {
    next(error);
  }
};

export const updatePrinterLog = async (req, res, next) => {
  try {
    const { product_name, serial_number, total_impressions, created_at } = req.body;
    const updatedLog = await PrinterLog.update(req.params.id, {
      product_name,
      serial_number,
      total_impressions,
      ...(created_at && { created_at })
    });
    res.json(updatedLog);
  } catch (error) {
    next(error);
  }
};

export const deletePrinterLog = async (req, res, next) => {
  try {
    await PrinterLog.delete(req.params.id);
    res.json({ message: 'Printer log deleted successfully' });
  } catch (error) {
    next(error);
  }
};
