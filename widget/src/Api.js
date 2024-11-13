import axios from 'axios';
import { API_URL } from "./base"

const Api = axios.create({
    baseURL: `${API_URL}`,
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    },
    withCredentials: true,
    timeout: 120000,
});

export default Api;