import React from 'react';
import styled from 'styled-components';

const AccountListItem = ({ account, selected, onClick }) => {
  return (
    <ItemRoot $selected={selected} onClick={onClick}>
      <div>
        <AccountName>{account.name}</AccountName>
        <AccountType>{account.type}</AccountType>
      </div>
      <AccountBalance>{account.current_balance ? `$${Number(account.current_balance).toLocaleString()}` : '-'}</AccountBalance>
    </ItemRoot>
  );
};

const ItemRoot = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 18px;
  margin: 0 8px 6px 8px;
  border-radius: 8px;
  background: ${({ $selected }) => ($selected ? '#e3f0fc' : 'transparent')};
  color: ${({ $selected }) => ($selected ? '#1976d2' : '#222')};
  font-weight: ${({ $selected }) => ($selected ? 600 : 400)};
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
  &:hover {
    background: #f0f4fa;
    color: #1976d2;
  }
`;

const AccountName = styled.div`
  font-size: 1rem;
  font-weight: 500;
`;

const AccountType = styled.div`
  font-size: 0.8rem;
  color: #888;
`;

const AccountBalance = styled.div`
  font-size: 1rem;
  font-weight: 600;
`;

export default AccountListItem; 