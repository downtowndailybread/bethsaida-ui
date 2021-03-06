import Client from "../data/Client";
import BethsaidaEvent from "../data/BethsaidaEvent";
import Env from "../environment/Env";
import ServiceBase from "./ServiceBase";
import {AsyncAction} from "../actions/Async";
import {clearErrorMessage, setErrorMessage} from "../actions/Base";
import Attendance from "../data/Attendance";
import User from "../data/User";

const parse = (data: any, id?: string): Attendance => {
    return new Attendance(
        data['id'] || id,
        new Date(data['checkInTime']),
        data['clientId'],
        data['eventId'],
        data['userId']
    )
}

export const removeAttendance = (id: string, act: (id: string) => void): AsyncAction => {
    return (dispatch) => {
        fetch(Env.get().fullUrl() + '/attendance/' + id + '/delete', {
            method: 'POST',
            headers: ServiceBase.authenticationHeader
        }).then(
            resp =>
                resp.json().then(
                    data => {
                        if(resp.ok) {
                            dispatch(clearErrorMessage());
                            act(id);
                        } else {
                            dispatch(setErrorMessage(data['message']))
                        }
                    }
                )
        )
    }
}

export const GetAttendanceRecords = (event: BethsaidaEvent, success: (attendances: Attendance[]) => void): AsyncAction => {
    return (dispatch) => {
        fetch(Env.get().fullUrl() + '/attendance/event/' + event.id, {
            method: 'GET',
            headers: ServiceBase.authenticationHeader
        }).then(
            resp => {
                resp.json().then(
                    data => {
                        if (resp.ok) {
                            dispatch(clearErrorMessage());
                            const ids = (data as []).map((d) => parse(d));
                            success(ids)
                        } else {
                            dispatch(setErrorMessage(data['message']));
                        }
                    }
                )
            }
        )
    }
}

export const CreateAttendanceRecord = (client: Client, event: BethsaidaEvent, user: User, success: (attendance: Attendance) => void): AsyncAction => {
    return (dispatch) => {
        if (client.id !== undefined) {
            const checkInTime = new Date();
            fetch(Env.get().fullUrl() + '/attendance/new', {
                method: 'POST',
                headers: ServiceBase.jsonHeader,
                body: JSON.stringify({
                    eventId: event.id,
                    clientId: client.id,
                    checkInTime: checkInTime,
                    userId: user.id
                })
            }).then(
                resp => {
                    resp.json().then(
                        data => {
                            if (resp.ok) {
                                const attend = new Attendance(
                                    data['id'],
                                    checkInTime,
                                    client.id || '',
                                    event.id,
                                    user.id || ''
                                );
                                dispatch(clearErrorMessage())
                                success(attend);
                            } else {
                                dispatch(setErrorMessage(data['message']))
                            }
                        }
                    )
                }
            )
        }
    }
};
