import React, {Fragment} from 'react';
import {AppState} from "../../reducers/AppState";
import {AsyncDispatch} from "../../actions/Async";
import {connect, ConnectedProps} from "react-redux";
import {
    DeleteClient,
    DeleteClientBan,
    GetClientEvents,
    GetSingleClient,
    GetSingleClientBan,
    NewClientBan
} from "../../services/Client";
import {RouteChildrenProps, withRouter} from 'react-router-dom'
import FileContainer from "../../components/app/FileContainer";
import Client from "../../data/Client";
import Env from "../../environment/Env";
import DateUtil from "../../util/DateUtil";
import {Race} from "../../data/Race";
import {Gender} from "../../data/Gender";
import {Title} from "../../components/app/Title";
import Credentials from "../../data/Credentials";
import Notes from "../../components/Notes";
import BanModal from "../../components/client/BanModal";
import Ban from "../../data/Ban";
import BanBuilder from "../../data/BanBuilder";
import TextModal from "../../components/app/TextModal";
import {GetNote, SetNote} from "../../services/Note";
import {formatEnum} from "../../util/StringUtil";
import User from "../../data/User";
import {GetAllUsers} from "../../services/User";
import unknown from '../../assets/unknown-image.png';
import {ActivityGrid} from "../../components/client/ActivityGrid";
import Attendance from "../../data/Attendance";
import AttendanceData from "../../data/AttendanceData";
import ClientPage from "../../components/client/ClientPage";
import ClientImage from "../../components/client/ClientImage";

const mapStateToProps = (state: AppState) => ({
    clientState: state.clientState,
    base: state.base
})


const mapDispatchToProps = (dispatch: AsyncDispatch) => {
    return {
        getSingleClient: (id: string, action: (c: Client) => void, users: User[]) => dispatch(GetSingleClient(id, action, users)),
        getSingleClientBan: (id: string, action: (ban?: Ban) => void) => dispatch(GetSingleClientBan(id, action)),
        getClientEvents: (id: string, action: (c: AttendanceData[]) => void) => dispatch(GetClientEvents(id, action)),
        newBan: (id: string, ban: Ban, action: (ban: Ban) => void) => dispatch(NewClientBan(id, ban, action)),
        deleteBan: (id: string, action: () => void) => dispatch(DeleteClientBan(id, action)),
        deleteClient: (id: string, action: () => void) => dispatch(DeleteClient(id, action)),
        setNote: (id: string, note: string, action: (text: string) => void) => dispatch(SetNote(id, note, action)),
        getNote: (id: string, action: (text: string) => void) => dispatch(GetNote(id, action)),
        getUsers: (action: (users: User[]) => void) => dispatch(GetAllUsers(action))
    };
}

const connector = connect(
    mapStateToProps,
    mapDispatchToProps
);

type PropsFromRedux = ConnectedProps<typeof connector>

interface RouteProps {
    id: string
}



interface IState {
    client?: Client,
    showBanModal: boolean,
    showTextModal: boolean,
    ban?: Ban,
    note?: string,
    users: User[],
    events?: AttendanceData[]
}

type Props = PropsFromRedux & RouteChildrenProps<RouteProps>

class ShowClient extends React.Component<Props, IState> {

    constructor(props: Props) {
        super(props);

        this.state = {
            client: undefined,
            showBanModal: false,
            showTextModal: false,
            users: []
        }

    }

    componentDidMount(): void {
        const id = this.props.match?.params.id;
        if (id) {
            this.props.getUsers((users) => {
                this.props.getSingleClient(id, (c: Client) => {
                    this.props.getSingleClientBan(id, (b?: Ban) => {
                        this.props.getClientEvents(id, (a: AttendanceData[]) => {
                            this.props.getNote(id, (note: string) => {
                                this.setState({client: c, ban: b, note: note, events: a, users})
                            })
                        })
                    })
                }, users)
            })
        }
    }


    private handleBan = (ban: BanBuilder): void => {
        const action = (b: Ban): void => {
            this.setState(Object.assign({}, this.state, {ban: b, showBanModal: false}))
        }
        const id = this.state.client?.id || '';
        this.props.newBan(id, ban.build(), action);
    }

    private deleteBan = (): void => {
        this.props.deleteBan(this.state.client?.id || '', () => {
            this.setState(Object.assign({}, this.state, {ban: undefined, showBanModal: false}))
        })
    }

    private setBanModal = (showBanModal: boolean) => {
        this.setState(
            Object.assign({}, this.state, {showBanModal})
        )
    }

    private setTextModal = (showTextModal: boolean) => {
        this.setState(
            Object.assign({}, this.state, {showTextModal})
        )
    }

    render() {
        if (this.state.client !== undefined) {
            const client: Client = this.state.client;
            return (
                <FileContainer>
                    <Title name={client.fullName}>
                        <button
                            className='btn-success form-control'
                            type='button'
                            onClick={() => window.location.href = '/client/' + (this.state.client?.id || '') + '/edit'}>
                            Edit
                        </button>
                        <BanModal
                            client={this.state.client}
                            closeModal={() => this.setBanModal(false)}
                            show={this.state.showBanModal}
                            ban={BanBuilder.load(this.state.ban)}
                            update={this.handleBan}
                            delete={this.deleteBan}
                            newBan={this.state.ban !== undefined}
                        />
                        <TextModal title='Ban Notes' text={
                            this.state.ban?.notes
                        } show={this.state.showTextModal} close={() => this.setTextModal(false)}/>
                        <button className='btn btn-warning form-control' type='button'
                                onClick={() => this.setBanModal(true)}>Ban From DDB Services
                        </button>
                        {
                            (
                                () => {
                                    if (new Credentials().getDisplayAdmin()) {
                                        return <button
                                            className='btn btn-danger form-control'
                                            type={'button'}
                                            onClick={() => {
                                                if (this.state.client !== undefined && this.state.client.id !== undefined) {
                                                    const confirm = window.confirm("Are you sure you want to delete the client " + (this.state.client?.fullName || ''))
                                                    if (confirm) {
                                                        this.props.deleteClient(this.state.client.id, () => {
                                                            window.location.href = '/client/'
                                                        })
                                                    }
                                                }
                                            }}
                                        >Delete Client</button>
                                    } else {
                                        return <Fragment/>
                                    }
                                }
                            )()
                        }
                    </Title>
                    <div className={(this.state.ban === undefined ? 'd-none' : '') + ' banned-error'}>
                        {this.state.client?.fullName} is banned (starting {this.state.ban?.getDateString()}) from using Downtown Daily Bread
                        services {this.state.ban ? this.state.ban.stringRepresentation : ''}.&nbsp;
                        {
                            (
                                () => {
                                    if (this.state.ban?.notes !== undefined && this.state.ban?.notes !== '') {
                                        return <span className={'details-link'}
                                                     onClick={() => this.setTextModal(true)}>Details</span>
                                    } else {
                                        return <Fragment/>
                                    }
                                }
                            )()
                        }
                    </div>
                    <div className='row profile-body'>
                        <div className='col-lg-3 profile-side'>
                            <ClientImage client={this.state.client} tpe='photograph'/>
                        </div>
                        <div className='col-lg-5'>
                            <ClientPage client={this.state.client} events={this.state.events} id={'clientpage'}/>
                        </div>
                        <div className='col-md-12 col-lg-4 note-col'>
                            <Notes
                                onUpdate={
                                    (d, e) => this.props.setNote((this.state.client as Client).id || '', d, (note) => {
                                        e(note)
                                    })}
                                notes={this.state.note}
                            />
                        </div>
                    </div>


                    {/*</ClientPage>*/}
                </FileContainer>
            )
        } else {
            return <FileContainer/>
        }

    }
}

export default withRouter(connector(ShowClient))