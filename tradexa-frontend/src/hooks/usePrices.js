import { useContext } from "react";
import { PriceContext } from "../context/PriceContext";

const usePrices = () => useContext(PriceContext);

export default usePrices;
